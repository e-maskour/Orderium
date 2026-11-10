'use client';

import { useRef, useState, type FormEvent } from 'react';
import { mailLink, waLink } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries/fr';

type Props = { t: Dictionary['form']; wa: Dictionary['wa'] };

const validPhone = (v: string) => v.replace(/\D/g, '').length >= 9;

export function LeadForm({ t, wa }: Props) {
  const form = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState({ name: false, phone: false });
  const [status, setStatus] = useState('');

  const read = () => {
    const f = new FormData(form.current!);
    return {
      name: String(f.get('name') ?? '').trim(),
      company: String(f.get('company') ?? '').trim(),
      phone: String(f.get('phone') ?? '').trim(),
      activity: String(f.get('activity') ?? ''),
      message: String(f.get('message') ?? '').trim(),
    };
  };

  const validate = () => {
    const v = read();
    const next = { name: v.name.length < 2, phone: !validPhone(v.phone) };
    setErrors(next);
    if (next.name) form.current!.querySelector<HTMLInputElement>('#f-name')?.focus();
    else if (next.phone) form.current!.querySelector<HTMLInputElement>('#f-phone')?.focus();
    return !next.name && !next.phone ? v : null;
  };

  const compose = (v: ReturnType<typeof read>) => {
    const L = wa.labels;
    const lines = [wa.greeting, '', `${L.name} : ${v.name}`];
    if (v.company) lines.push(`${L.company} : ${v.company}`);
    lines.push(`${L.phone} : ${v.phone}`);
    if (v.activity) lines.push(`${L.activity} : ${v.activity}`);
    if (v.message) lines.push(`${L.message} : ${v.message}`);
    return lines.join('\n');
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (!v) return;
    window.open(waLink(compose(v)), '_blank', 'noopener');
    setStatus(t.opened);
  };

  const onMail = () => {
    const v = validate();
    if (!v) return;
    window.location.href = mailLink(wa.mailSubject, compose(v));
    setStatus(t.openedMail);
  };

  const recheck = (field: 'name' | 'phone') => {
    if (errors[field]) {
      const v = read();
      setErrors((e) => ({ ...e, [field]: field === 'name' ? v.name.length < 2 : !validPhone(v.phone) }));
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
      <div className="form__actions field--full">
        <button className="btn btn--primary btn--lg" type="submit">{t.submit}</button>
        <button className="btn btn--link" type="button" onClick={onMail}>{t.mail}</button>
      </div>
      <p className="form__ok" role="status" aria-live="polite">{status}</p>
    </form>
  );
}
