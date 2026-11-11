'use client';

import { useEffect, useState } from 'react';
import { WhatsAppIcon } from './icons';

/** Appears once the hero has scrolled away; hides while the contact section is on screen. */
export function WhatsAppFloat({ href, label }: { href: string; label: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.querySelector('.hero');
    const contact = document.getElementById('contact');
    if (!hero || !contact) return;
    let pastHero = false;
    let atContact = false;
    const update = () => setVisible(pastHero && !atContact);
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) pastHero = !e.isIntersecting;
        if (e.target === contact) atContact = e.isIntersecting;
      }
      update();
    }, { threshold: 0, rootMargin: '0px 0px -40% 0px' });
    io.observe(hero);
    io.observe(contact);
    return () => io.disconnect();
  }, []);

  return (
    <a className={`wa-float${visible ? ' is-visible' : ''}`} href={href} target="_blank" rel="noopener" aria-label={label} tabIndex={visible ? 0 : -1}>
      <WhatsAppIcon />
    </a>
  );
}
