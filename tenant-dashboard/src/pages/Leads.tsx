import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Inbox, Mail, MessageCircle, Phone, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDeleteLead, useLeads, useUpdateLead } from '../hooks/useLeads';
import { Pagination } from '../components/Pagination';
import { SearchBar } from '../components/SearchBar';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SkeletonListItem } from '../components/Skeleton';
import { formatDateTime } from '../utils/dateFormat';
import { apiErrorMessage } from '../api/client';
import { LEAD_STATUSES, type Lead, type LeadStatus } from '../types/lead';

const PAGE_SIZE = 20;

const STATUS_META: Record<LeadStatus, { label: string; cls: string }> = {
  new: {
    label: 'New',
    cls: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  },
  contacted: {
    label: 'Contacted',
    cls: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  },
  qualified: {
    label: 'Qualified',
    cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  },
  won: {
    label: 'Won',
    cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  lost: { label: 'Lost', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
};

/** Moroccan local numbers (06…, 07…, 05…) → international digits for wa.me / tel:. */
function intlDigits(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.startsWith('00')) return d.slice(2);
  if (d.startsWith('0')) return `212${d.slice(1)}`;
  return d;
}

function sourceOf(lead: Lead): string {
  const utm = [lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(' / ');
  if (utm) return utm;
  if (lead.referrer) {
    try {
      return new URL(lead.referrer).hostname.replace(/^www\./, '');
    } catch {
      return lead.referrer;
    }
  }
  return 'Direct';
}

function LeadRow({ lead, onDelete }: { lead: Lead; onDelete: (lead: Lead) => void }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(lead.notes ?? '');
  const update = useUpdateLead();
  useEffect(() => setNotes(lead.notes ?? ''), [lead.notes]);

  const save = async (input: { status?: LeadStatus; notes?: string }, ok: string) => {
    try {
      await update.mutateAsync({ id: lead.id, input });
      toast.success(ok);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not update the lead'));
    }
  };

  const wa = `https://wa.me/${intlDigits(lead.phone)}?text=${encodeURIComponent(
    lead.locale === 'ar'
      ? `السلام عليكم ${lead.name}، شكراً على اهتمامك بمارنوفا.`
      : `Bonjour ${lead.name}, merci pour votre intérêt pour Marnova.`,
  )}`;

  return (
    <>
      <tr className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
        <td className="px-5 py-3.5">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex items-start gap-2 text-left"
          >
            {open ? (
              <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            ) : (
              <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            )}
            <span>
              <span className="block font-medium text-slate-900 dark:text-slate-100">
                {lead.name}
              </span>
              <span className="block text-xs text-slate-500">{lead.company ?? '—'}</span>
            </span>
          </button>
        </td>
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate-700 dark:text-slate-300" dir="ltr">
              {lead.phone}
            </span>
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
              aria-label={`WhatsApp ${lead.name}`}
              title="Reply on WhatsApp"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
            <a
              href={`tel:+${intlDigits(lead.phone)}`}
              className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label={`Call ${lead.name}`}
              title="Call"
            >
              <Phone className="h-4 w-4" />
            </a>
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label={`E-mail ${lead.name}`}
                title={lead.email}
              >
                <Mail className="h-4 w-4" />
              </a>
            )}
          </div>
        </td>
        <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{lead.activity ?? '—'}</td>
        <td className="px-5 py-3.5 text-xs text-slate-500">{sourceOf(lead)}</td>
        <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
          {formatDateTime(lead.createdAt)}
        </td>
        <td className="px-5 py-3.5">
          <select
            value={lead.status}
            disabled={update.isPending}
            onChange={(e) => void save({ status: e.target.value as LeadStatus }, 'Status updated')}
            aria-label={`Status of ${lead.name}`}
            className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold ${STATUS_META[lead.status].cls}`}
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
        </td>
      </tr>
      {open && (
        <tr className="bg-slate-50/60 dark:bg-slate-900/40">
          <td colSpan={6} className="px-5 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 text-sm">
                <p className="label">Message</p>
                <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                  {lead.message || <span className="text-slate-400">No message</span>}
                </p>
                <p className="text-xs text-slate-400">
                  Language: {lead.locale.toUpperCase()} · Continued on{' '}
                  {lead.channel === 'email' ? 'e-mail' : 'WhatsApp'}
                  {lead.landingPath ? ` · Page ${lead.landingPath}` : ''}
                  {lead.contactedAt ? ` · First contact ${formatDateTime(lead.contactedAt)}` : ''}
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor={`notes-${lead.id}`} className="label">
                  Follow-up notes
                </label>
                <textarea
                  id={`notes-${lead.id}`}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="input"
                  placeholder="Called on…, demo planned…, needs POS + 2 depots…"
                />
                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => onDelete(lead)}
                    className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                  <button
                    type="button"
                    disabled={update.isPending || notes === (lead.notes ?? '')}
                    onClick={() => void save({ notes }, 'Notes saved')}
                    className="btn-primary px-3 py-1.5 text-xs"
                  >
                    Save notes
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/** Leads captured by the landing page, with a light follow-up pipeline. */
export function Leads() {
  const [status, setStatus] = useState<LeadStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<Lead | null>(null);
  const del = useDeleteLead();

  const { data, isLoading } = useLeads({ status, search, page, pageSize: PAGE_SIZE });
  const counts = data?.counts;
  const all = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;
  useEffect(() => setPage(1), [status, search]);

  const chips: { key: LeadStatus | 'all'; label: string; n: number }[] = [
    { key: 'all', label: 'All', n: all },
    ...LEAD_STATUSES.map((s) => ({ key: s, label: STATUS_META[s].label, n: counts?.[s] ?? 0 })),
  ];

  return (
    <div className="animate-fade-in space-y-6 px-4 py-6 sm:px-8 sm:py-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Leads</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Contact requests from the landing page. Reply fast: a lead answered within the hour
          converts far more often.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by status">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setStatus(c.key)}
            aria-pressed={status === c.key}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              status === c.key
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700'
            }`}
          >
            {c.label} <span className="ml-1 opacity-75">{c.n}</span>
          </button>
        ))}
        <div className="ml-auto w-full sm:w-72">
          <SearchBar value={search} onChange={setSearch} placeholder="Name, company, phone…" />
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 5 }, (_, i) => (
              <SkeletonListItem key={i} />
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
            <Inbox className="h-8 w-8 text-slate-300" />
            <p className="font-medium text-slate-700 dark:text-slate-200">No leads yet</p>
            <p className="text-sm text-slate-500">
              Leads appear here as soon as someone fills the landing page form.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Landing page leads, newest first</caption>
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th scope="col" className="px-5 py-3">
                    Lead
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Contact
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Activity
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Source
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Received
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.items.map((lead) => (
                  <LeadRow key={lead.id} lead={lead} onDelete={setToDelete} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.total > PAGE_SIZE && (
          <div className="border-t border-slate-100 px-5 py-3 dark:border-slate-800">
            <Pagination
              page={page}
              totalPages={Math.ceil(data.total / PAGE_SIZE)}
              total={data.total}
              limit={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this lead?"
        description={`${toDelete?.name ?? ''} will be removed permanently. Use it for spam or duplicates.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={del.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await del.mutateAsync(toDelete.id);
            toast.success('Lead deleted');
          } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not delete the lead'));
          } finally {
            setToDelete(null);
          }
        }}
      />
    </div>
  );
}
