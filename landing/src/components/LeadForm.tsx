'use client';

import { useRef, useState, type FormEvent } from 'react';
import { API_URL, waLink } from '@/i18n/config';
import { track } from '@/lib/analytics';
import { getAttribution } from '@/lib/attribution';
import type { Dictionary } from '@/i18n/dictionaries/fr';

type Props = { t: Dictionary['form']; wa: Dictionary['wa'] };

const validPhone = (v: string) => v.replace(/\D/g, '').length >= 9;
const validEmail = (v: string) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

type LeadValues = {
  name: string;
  company: string;
  phone: string;
  email: string;
  activity: string;
  message: string;
  website: string;
};

const leadBody = (v: LeadValues, channel: 'whatsapp' | 'email') => JSON.stringify({
  name: v.name,
  company: v.company || undefined,
  phone: v.phone,
  email: v.email || undefined,
  activity: v.activity || undefined,
  message: v.message || undefined,
  website: v.website || undefined,
  locale: document.documentElement.lang === 'ar' ? 'ar' : 'fr',
  channel,
  ...getAttribution(),
});

/**
 * Default path: the API stores the lead and e-mails it to the team. Resolves
 * true only once the server confirms the e-mail went out.
 */
async function emailLead(v: LeadValues): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/public/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: leadBody(v, 'email'),
    });
    if (res.ok) track('generate_lead', { method: 'email', activity: v.activity || undefined });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * WhatsApp path: saves the lead before the visitor leaves. `keepalive` lets the
 * request finish during navigation, and it is not awaited so the WhatsApp
 * window still opens inside the click (popup blockers only allow that
 * synchronously).
 */
function saveWhatsAppLead(v: LeadValues) {
  try {
    void fetch(`${API_URL}/api/public/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: leadBody(v, 'whatsapp'),
      keepalive: true,
    }).catch(() => {
      /* offline or API down: the WhatsApp message still carries the request */
    });
  } catch {
    /* never block the visitor */
  }
  track('generate_lead', { method: 'whatsapp', activity: v.activity || undefined });
}

export function LeadForm({ t, wa }: Props) {
  const form = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState({ name: false, phone: false, email: false });
  const [status, setStatus] = useState<{ text: string; error?: boolean }>({ text: '' });
  const [sending, setSending] = useState(false);

  const read = () => {
    const f = new FormData(form.current!);
    return {
      name: String(f.get('name') ?? '').trim(),
      company: String(f.get('company') ?? '').trim(),
      phone: String(f.get('phone') ?? '').trim(),
      email: String(f.get('email') ?? '').trim(),
      activity: String(f.get('activity') ?? ''),
      message: String(f.get('message') ?? '').trim(),
      website: String(f.get('website') ?? '').trim(),
    };
  };

  const validate = () => {
    const v = read();
    const next = { name: v.name.length < 2, phone: !validPhone(v.phone), email: !validEmail(v.email) };
    setErrors(next);
    const first = next.name ? '#f-name' : next.phone ? '#f-phone' : next.email ? '#f-email' : null;
    if (first) form.current!.querySelector<HTMLInputElement>(first)?.focus();
    return first ? null : v;
  };

  const compose = (v: ReturnType<typeof read>) => {
    const L = wa.labels;
    const lines = [wa.greeting, '', `${L.name} : ${v.name}`];
    if (v.company) lines.push(`${L.company} : ${v.company}`);
    lines.push(`${L.phone} : ${v.phone}`);
    if (v.email) lines.push(`${L.email} : ${v.email}`);
    if (v.activity) lines.push(`${L.activity} : ${v.activity}`);
    if (v.message) lines.push(`${L.message} : ${v.message}`);
    return lines.join('\n');
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (sending) return;
    const v = validate();
    if (!v) return;
    setSending(true);
    setStatus({ text: t.sending });
    const ok = await emailLead(v);
    setSending(false);
    if (ok) {
      form.current!.reset();
      setStatus({ text: t.sent });
    } else {
      setStatus({ text: t.sendFailed, error: true });
    }
  };

  const onWhatsApp = () => {
    const v = validate();
    if (!v) return;
    saveWhatsAppLead(v);
    window.open(waLink(compose(v)), '_blank', 'noopener');
    setStatus({ text: t.opened });
  };

  const recheck = (field: 'name' | 'phone' | 'email') => {
    if (errors[field]) {
      const v = read();
      const bad = { name: v.name.length < 2, phone: !validPhone(v.phone), email: !validEmail(v.email) }[field];
      setErrors((e) => ({ ...e, [field]: bad }));
    }
  };

  return (
    <form className="form" ref={form} onSubmit={onSubmit} noValidate>
      <div className={`field${errors.name ? ' is-invalid' : ''}`}>
        <label htmlFor="f-name">{t.name}</label>
        <input id="f-name" name="name" autoComplete="name" required aria-invalid={errors.name} aria-describedby="f-name-err" onInput={() => recheck('name')} />
        <p className="field__err" id="f-name-err">{t.errName}</p>
      </div>
      <div className="field">
        <label htmlFor="f-company">{t.company}</label>
        <input id="f-company" name="company" autoComplete="organization" />
      </div>
      <div className={`field${errors.phone ? ' is-invalid' : ''}`}>
        <label htmlFor="f-phone">{t.phone}</label>
        <input
          id="f-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" dir="ltr" placeholder="06 00 00 00 00"
          required aria-invalid={errors.phone} aria-describedby="f-phone-err" onInput={() => recheck('phone')}
        />
        <p className="field__err" id="f-phone-err">{t.errPhone}</p>
      </div>
      <div className={`field${errors.email ? ' is-invalid' : ''}`}>
        <label htmlFor="f-email">
          {t.email} <span className="opt">{t.optional}</span>
        </label>
        <input
          id="f-email" name="email" type="email" autoComplete="email" inputMode="email" dir="ltr"
          aria-invalid={errors.email} aria-describedby="f-email-err" onInput={() => recheck('email')}
        />
        <p className="field__err" id="f-email-err">{t.errEmail}</p>
      </div>
      <div className="field">
        <label htmlFor="f-activity">{t.activity}</label>
        <select id="f-activity" name="activity" defaultValue="">
          <option value="">{t.choose}</option>
          {t.activities.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>
      <div className="field field--full">
        <label htmlFor="f-msg">
          {t.msg} <span className="opt">{t.optional}</span>
        </label>
        <textarea id="f-msg" name="message" rows={3} placeholder={t.msgPh} />
      </div>
      {/* Anti-spam honeypot: invisible to people and to assistive tech. */}
      <div className="form__hp" aria-hidden="true">
        <label htmlFor="f-website">Website</label>
        <input id="f-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="form__actions field--full">
        <button className="btn btn--primary btn--lg" type="submit" disabled={sending} aria-busy={sending}>
          {sending ? t.sending : t.submit}
        </button>
        <button className="btn btn--link" type="button" onClick={onWhatsApp}>{t.whatsapp}</button>
      </div>
      <p className={`form__ok${status.error ? ' form__ok--error' : ''}`} role="status" aria-live="polite">
        {status.text}
      </p>
    </form>
  );
}
