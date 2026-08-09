import { Injectable } from '@nestjs/common';
import {
  KpiCard,
  ReportBlock,
  ReportDocument,
  ReportMapper,
  ReportMapperContext,
  TableBlock,
  Tone,
} from '../../types';
import {
  SalesSummaryData,
  SalesSummaryOrderRow,
  SalesSummaryProductRow,
} from './sales-summary.types';

/** Report type key — matches `ReportConfig.reportType`. */
export const SALES_SUMMARY_REPORT_TYPE = 'sales-summary';

/** Order statuses mapped to badge tones. Unknown statuses stay neutral. */
const STATUS_TONES: Record<string, Tone> = {
  PAID: 'positive',
  COMPLETED: 'positive',
  DELIVERED: 'positive',
  PENDING: 'warning',
  PARTIALLY_PAID: 'warning',
  CANCELLED: 'negative',
  REFUNDED: 'negative',
};

/**
 * Sales Summary — the reference implementation of a report type.
 *
 * It is *only* a data mapper: no HTML, no styling, no API knowledge. Everything
 * visual comes from the shared engine and template components, which is exactly
 * what a new report type needs to look like.
 */
@Injectable()
export class SalesSummaryMapper implements ReportMapper<SalesSummaryData> {
  readonly reportType = SALES_SUMMARY_REPORT_TYPE;
  readonly defaultTitle = 'Rapport de ventes';

  map(data: SalesSummaryData, ctx: ReportMapperContext): ReportDocument {
    const { format } = ctx;

    const periodLabel = data.period.label
      ? `${data.period.label} — ${format.date(data.period.from)} → ${format.date(data.period.to)}`
      : `${format.date(data.period.from)} → ${format.date(data.period.to)}`;

    const blocks: ReportBlock[] = [
      { kind: 'kpi-grid', cards: this.buildKpiCards(data, ctx) },
      {
        kind: 'section',
        title: 'Détail des commandes',
        description: periodLabel,
        blocks: [this.buildOrdersTable(data, ctx)],
      },
    ];

    // Optional sections are simply omitted — no empty scaffolding in the PDF.
    if (data.topProducts?.length) {
      blocks.push({
        kind: 'section',
        title: 'Meilleures ventes',
        description: 'Produits classés par chiffre d’affaires',
        blocks: [this.buildTopProductsTable(data.topProducts)],
      });
    }

    return {
      title: 'Rapport de ventes',
      subtitle: periodLabel,
      summary: data.summary,
      blocks,
    };
  }

  /** Headline figures shown as summary cards above the tables. */
  private buildKpiCards(
    data: SalesSummaryData,
    ctx: ReportMapperContext,
  ): KpiCard[] {
    const { kpis } = data;
    const { format, config } = ctx;

    const cards: KpiCard[] = [
      {
        label: 'Chiffre d’affaires',
        value: kpis.totalRevenue,
        format: 'currency',
        hint: `${format.integer(kpis.totalOrders)} commande(s)`,
        accent: config.theme.primary,
      },
      {
        label: 'Commandes',
        value: kpis.totalOrders,
        format: 'integer',
        accent: config.theme.accent,
      },
      {
        label: 'Panier moyen',
        value: kpis.avgOrder,
        format: 'currency',
        accent: config.theme.accent,
      },
    ];

    if (kpis.revenueChangePercent !== undefined) {
      const change = kpis.revenueChangePercent;
      cards.push({
        label: 'Évolution',
        value: change,
        format: 'percent',
        hint: 'vs. période précédente',
        delta: {
          value: `${change >= 0 ? '+' : ''}${format.percent(change)}`,
          tone: change >= 0 ? 'positive' : 'negative',
        },
        accent: change >= 0 ? config.theme.positive : config.theme.negative,
      });
    }

    return cards;
  }

  /** Order detail table with a currency totals row. */
  private buildOrdersTable(
    data: SalesSummaryData,
    ctx: ReportMapperContext,
  ): TableBlock {
    const revenueTotal = data.orders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0,
    );

    const showChannel = data.orders.some((order) => Boolean(order.channel));

    const note =
      data.totalOrderCount && data.totalOrderCount > data.orders.length
        ? `${ctx.format.integer(data.orders.length)} commande(s) affichée(s) sur ${ctx.format.integer(
            data.totalOrderCount,
          )}.`
        : undefined;

    return {
      kind: 'table',
      zebra: true,
      note,
      emptyMessage: 'Aucune commande sur la période sélectionnée.',
      columns: [
        { key: 'reference', header: 'Référence', emphasis: true, width: '16%' },
        { key: 'date', header: 'Date', format: 'date', width: '12%' },
        { key: 'customer', header: 'Client' },
        ...(showChannel
          ? [{ key: 'channel', header: 'Canal', width: '14%' } as const]
          : []),
        {
          key: 'status',
          header: 'Statut',
          width: '14%',
          align: 'center' as const,
          badgeTone: (value: unknown): Tone =>
            STATUS_TONES[String(value).toUpperCase()] ?? 'neutral',
        },
        {
          key: 'total',
          header: 'Total',
          format: 'currency' as const,
          emphasis: true,
          width: '16%',
        },
      ],
      rows: data.orders.map((order: SalesSummaryOrderRow) => ({
        reference: order.reference,
        date: order.date,
        customer: order.customer,
        channel: order.channel,
        status: order.status,
        total: Number(order.total || 0),
      })),
      totals: { total: revenueTotal },
      totalsLabel: 'Total période',
    };
  }

  /** Best-sellers table; the revenue share column appears only when supplied. */
  private buildTopProductsTable(rows: SalesSummaryProductRow[]): TableBlock {
    const hasShare = rows.some((row) => row.sharePercent !== undefined);

    return {
      kind: 'table',
      zebra: true,
      columns: [
        { key: 'product', header: 'Produit', emphasis: true },
        {
          key: 'quantity',
          header: 'Quantité',
          format: 'integer',
          width: '16%',
        },
        ...(hasShare
          ? [
              {
                key: 'sharePercent',
                header: 'Part du CA',
                format: 'percent' as const,
                width: '16%',
              },
            ]
          : []),
        {
          key: 'revenue',
          header: 'Chiffre d’affaires',
          format: 'currency' as const,
          emphasis: true,
          width: '20%',
        },
      ],
      rows: rows.map((row) => ({
        product: row.product,
        quantity: Number(row.quantity || 0),
        sharePercent: row.sharePercent,
        revenue: Number(row.revenue || 0),
      })),
      totals: {
        quantity: rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0),
        revenue: rows.reduce((sum, row) => sum + Number(row.revenue || 0), 0),
      },
    };
  }
}
