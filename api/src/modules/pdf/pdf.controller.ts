import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PDFService } from './pdf.service';
import { PortalRoute } from '../auth/decorators/portal-route.decorator';
import { ApiRes } from '../../common/api-response';
import { PDF } from '../../common/response-codes';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { MERGE_SUMMARY_MAX_ORDERS } from '../orders/dto/merge-summary.dto';

@ApiTags('PDF')
@PortalRoute()
@Controller('pdf')
export class PDFController {
  constructor(private readonly pdfService: PDFService) {}

  /**
   * Generate PDF for invoice
   * @param invoiceId - Invoice ID
   * @param mode - 'preview' (inline) or 'download' (attachment)
   */
  @Get('invoice/:invoiceId')
  @ApiOperation({ summary: 'Generate PDF for invoice' })
  @ApiResponse({ status: 200, description: 'Invoice PDF generated' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  @ApiQuery({ name: 'mode', required: false, enum: ['preview', 'download'] })
  @ApiQuery({ name: 'lang', required: false, enum: ['fr', 'ar'] })
  @RequirePermission('documents.generate')
  async generateInvoicePDF(
    @Param('invoiceId') invoiceId: string,
    @Query('mode') mode: 'preview' | 'download' = 'download',
    @Query('lang') lang: 'fr' | 'ar' = 'fr',
    @Res() res: Response,
  ) {
    try {
      const { pdfBuffer, fileName } = await this.pdfService.generateDocumentPDF(
        'invoice',
        parseInt(invoiceId),
        lang,
      );

      const disposition = mode === 'preview' ? 'inline' : 'attachment';

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, max-age=300',
      });

      res.send(pdfBuffer);
    } catch (error: any) {
      res.status(error.status || 500).json({
        error: 'PDF generation failed',
        message: error.message,
      });
    }
  }

  /**
   * Generate PDF for quote
   * @param quoteId - Quote ID
   * @param mode - 'preview' (inline) or 'download' (attachment)
   */
  @Get('quote/:quoteId')
  @ApiOperation({ summary: 'Generate PDF for quote' })
  @ApiResponse({ status: 200, description: 'Quote PDF generated' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  @ApiQuery({ name: 'mode', required: false, enum: ['preview', 'download'] })
  @ApiQuery({ name: 'lang', required: false, enum: ['fr', 'ar'] })
  @RequirePermission('documents.generate')
  async generateQuotePDF(
    @Param('quoteId') quoteId: string,
    @Query('mode') mode: 'preview' | 'download' = 'download',
    @Query('lang') lang: 'fr' | 'ar' = 'fr',
    @Res() res: Response,
  ) {
    try {
      const { pdfBuffer, fileName } = await this.pdfService.generateDocumentPDF(
        'quote',
        parseInt(quoteId),
        lang,
      );

      const disposition = mode === 'preview' ? 'inline' : 'attachment';

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, max-age=300',
      });

      res.send(pdfBuffer);
    } catch (error: any) {
      res.status(error.status || 500).json({
        error: 'PDF generation failed',
        message: error.message,
      });
    }
  }

  /**
   * Generate PDF for delivery note (bon de livraison)
   * @param orderId - Order ID
   * @param mode - 'preview' (inline) or 'download' (attachment)
   */
  @Get('delivery-note/:orderId')
  @ApiOperation({ summary: 'Generate PDF for delivery note' })
  @ApiResponse({ status: 200, description: 'Delivery note PDF generated' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiQuery({ name: 'mode', required: false, enum: ['preview', 'download'] })
  @ApiQuery({ name: 'lang', required: false, enum: ['fr', 'ar'] })
  @RequirePermission('documents.generate')
  async generateDeliveryNotePDF(
    @Param('orderId') orderId: string,
    @Query('mode') mode: 'preview' | 'download' = 'download',
    @Query('lang') lang: 'fr' | 'ar' = 'fr',
    @Res() res: Response,
  ) {
    try {
      const { pdfBuffer, fileName } = await this.pdfService.generateDocumentPDF(
        'delivery-note',
        parseInt(orderId),
        lang,
      );

      const disposition = mode === 'preview' ? 'inline' : 'attachment';

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, max-age=300',
      });

      res.send(pdfBuffer);
    } catch (error: any) {
      res.status(error.status || 500).json({
        error: 'PDF generation failed',
        message: error.message,
      });
    }
  }

  /**
   * Generate receipt (80mm thermal) for order
   * @param orderId - Order ID
   */
  @Get('receipt/:orderId')
  @ApiOperation({ summary: 'Generate receipt PDF' })
  @ApiResponse({ status: 200, description: 'Receipt PDF generated' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiQuery({ name: 'mode', required: false, enum: ['preview', 'download'] })
  @ApiQuery({ name: 'lang', required: false, enum: ['fr', 'ar'] })
  @RequirePermission('documents.generate')
  async generateReceipt(
    @Param('orderId') orderId: string,
    @Query('mode') mode: 'preview' | 'download' = 'download',
    @Query('lang') lang: 'fr' | 'ar' = 'fr',
    @Res() res: Response,
  ) {
    try {
      const { pdfBuffer, fileName } = await this.pdfService.generateDocumentPDF(
        'receipt',
        parseInt(orderId),
        lang,
      );

      const disposition = mode === 'preview' ? 'inline' : 'attachment';

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, max-age=300',
      });

      res.send(pdfBuffer);
    } catch (error: any) {
      res.status(error.status || 500).json({
        error: 'PDF generation failed',
        message: error.message,
      });
    }
  }

  /**
   * Generate a consolidated A4 recap for several orders at once.
   * `ids` is a comma-separated list (e.g. ?ids=12,15,19) so the URL can be fed
   * straight to an <iframe> preview.
   */
  @Get('orders-merge')
  @ApiOperation({ summary: 'Generate consolidated PDF recap for many orders' })
  @ApiResponse({ status: 200, description: 'Merge recap PDF generated' })
  @ApiResponse({ status: 400, description: 'Invalid order ids' })
  @ApiQuery({ name: 'ids', required: true, description: 'Comma-separated ids' })
  @ApiQuery({ name: 'mode', required: false, enum: ['preview', 'download'] })
  @ApiQuery({ name: 'lang', required: false, enum: ['fr', 'ar'] })
  @RequirePermission('documents.generate')
  async generateOrdersMergePDF(
    @Query('ids') ids: string,
    @Res() res: Response,
    @Query('mode') mode: 'preview' | 'download' = 'download',
    @Query('lang') lang: 'fr' | 'ar' = 'fr',
  ) {
    const orderIds = (ids ?? '')
      .split(',')
      .map((raw) => raw.trim())
      .filter(Boolean)
      .map((raw) => Number.parseInt(raw, 10));

    if (orderIds.some((id) => !Number.isInteger(id) || id <= 0)) {
      throw new BadRequestException(
        'ids must be a comma-separated list of order ids',
      );
    }

    const uniqueIds = [...new Set(orderIds)];
    if (uniqueIds.length < 2) {
      throw new BadRequestException('At least 2 orders are required');
    }
    if (uniqueIds.length > MERGE_SUMMARY_MAX_ORDERS) {
      throw new BadRequestException(
        `At most ${MERGE_SUMMARY_MAX_ORDERS} orders can be merged at once`,
      );
    }

    try {
      const { pdfBuffer, fileName } =
        await this.pdfService.generateOrdersMergePDF(uniqueIds, lang);

      const disposition = mode === 'preview' ? 'inline' : 'attachment';

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, max-age=300',
      });

      res.send(pdfBuffer);
    } catch (error: any) {
      res.status(error.status || 500).json({
        error: 'PDF generation failed',
        message: error.message,
      });
    }
  }

  /**
   * Regenerate PDF for a document: delete old MinIO object, generate new PDF,
   * upload to MinIO and persist the new URL on the entity.
   */
  @Post('regenerate/:type/:id')
  @ApiOperation({ summary: 'Regenerate and re-store PDF for a document' })
  @ApiResponse({ status: 200, description: 'PDF regenerated successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @RequirePermission('documents.generate')
  async regeneratePDF(@Param('type') type: string, @Param('id') id: string) {
    const validTypes = ['invoice', 'quote', 'delivery-note'];
    if (!validTypes.includes(type)) {
      return ApiRes(
        { code: 'PDF400_01', status: 400, message: 'Invalid document type' },
        null,
      );
    }
    const newUrl = await this.pdfService.regeneratePDF(
      type as 'invoice' | 'quote' | 'delivery-note',
      parseInt(id),
    );
    return ApiRes(PDF.REGENERATED, { pdfUrl: newUrl });
  }
}
