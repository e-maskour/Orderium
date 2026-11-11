'use client';

import { useEffect } from 'react';

/** Runs before first paint: opt into motion unless the visitor prefers reduced motion. */
export const motionBootScript = `(function(d){try{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;d.classList.add('motion');setTimeout(function(){if(!d.classList.contains('motion-live'))d.classList.remove('motion')},5000)}catch(e){}})(document.documentElement)`;

/** Yield to the main thread between setup chunks so no single task gets long. */
const pause = () => new Promise<void>((r) => setTimeout(r, 0));

const q = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(sel));

/**
 * Page choreography. GSAP, ScrollTrigger and Lenis are code-split and loaded after
 * hydration, so they never delay first paint. Section markup stays server-rendered;
 * this component only reads data attributes:
 *   [data-split]        heading whose words rise in
 *   [data-anim]         block that fades/rises in (batched)
 *   [data-stage-host]   sticky element whose data-stage follows [data-stage-step] blocks
 *   [data-scrub=...]    scroll-scrubbed effects (strike, wipe, draw, line, wordmark)
 *   [data-tilt]         card tilting toward the pointer
 *   [data-magnetic]     button attracted by the pointer
 */
export function Motion() {
  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cleanup = () => {};
    let cancelled = false;

    (async () => {
      try {
        const [{ gsap }, { ScrollTrigger }, LenisMod] = await Promise.all([
          import('gsap'),
          import('gsap/ScrollTrigger'),
          reduce ? Promise.resolve(null) : import('lenis'),
        ]);
        if (cancelled) return;
        await pause();
        gsap.registerPlugin(ScrollTrigger);
        root.classList.add('motion-live');
        const rtl = root.dir === 'rtl';

        // ---- Stage hosts (chain document, apps device): work with or without motion ----
        const stageTriggers: ScrollTrigger[] = [];
        q('[data-stage-group]').forEach((group) => {
          const host = group.querySelector<HTMLElement>('[data-stage-host]');
          const steps = q('[data-stage-step]', group);
          if (!host || !steps.length) return;
          const set = (i: number) => {
            host.dataset.stage = String(i);
            steps.forEach((s, n) => s.classList.toggle('is-active', n === i));
          };
          set(0);
          steps.forEach((step, i) => {
            stageTriggers.push(
              ScrollTrigger.create({
                trigger: step,
                start: 'top 62%',
                end: 'bottom 62%',
                onToggle: (self) => self.isActive && set(i),
              }),
            );
          });
          const bar = group.querySelector<HTMLElement>('[data-stage-progress]');
          if (bar && !reduce) {
            stageTriggers.push(
              ScrollTrigger.create({
                trigger: group.querySelector('[data-stage-steps]') ?? group,
                start: 'top 62%',
                end: 'bottom 62%',
                onUpdate: (self) => bar.style.setProperty('--p', self.progress.toFixed(3)),
              }),
            );
          }
        });

        if (reduce || !root.classList.contains('motion')) {
          cleanup = () => stageTriggers.forEach((t) => t.kill());
          return;
        }

        await pause();
        if (cancelled) return;
        // ---- Smooth scrolling ----
        const Lenis = LenisMod!.default;
        const lenis = new Lenis({ lerp: 0.11, smoothWheel: true, wheelMultiplier: 0.95 });
        lenis.on('scroll', ScrollTrigger.update);
        const tick = (time: number) => lenis.raf(time * 1000);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);

        const onAnchor = (e: MouseEvent) => {
          const a = (e.target as Element | null)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
          if (!a) return;
          const id = a.getAttribute('href')!;
          const target = id === '#top' ? 0 : document.querySelector<HTMLElement>(id);
          if (target === null) return;
          e.preventDefault();
          lenis.scrollTo(target, { offset: id === '#top' ? 0 : -76, duration: 1.4 });
          if (id !== '#top') history.replaceState(null, '', id);
          if (target instanceof HTMLElement) target.setAttribute('tabindex', '-1');
          if (target instanceof HTMLElement) setTimeout(() => target.focus({ preventScroll: true }), 900);
        };
        document.addEventListener('click', onAnchor);

        const mm = gsap.matchMedia();
        await pause();
        const ctx = gsap.context(() => {
          // Split headings
          q('[data-split]').forEach((el) => {
            const words = q('.w > span', el);
            gsap.to(words, {
              y: 0,
              opacity: 1,
              duration: 1.1,
              ease: 'expo.out',
              stagger: 0.045,
              scrollTrigger: { trigger: el, start: 'top 88%', once: true },
            });
          });

          // Batched block reveals
          ScrollTrigger.batch('[data-anim]', {
            start: 'top 90%',
            once: true,
            onEnter: (batch) => {
              batch.forEach((b) => b.classList.add('is-in'));
              gsap.to(batch, { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 1, ease: 'expo.out', stagger: 0.09, overwrite: true });
            },
          });

          // Hero: copy drifts away, the product straightens and comes forward
          const hero = document.querySelector('.hero');
          const dash = document.querySelector<HTMLElement>('[data-dash]');
          if (hero && dash) {
            gsap.to('.hero__copy', { y: -60, opacity: 0.25, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: '45% top', scrub: true } });
            const flat = window.matchMedia('(max-width: 760px)').matches;
            gsap.fromTo(
              dash,
              { rotateX: flat ? 8 : 14, scale: flat ? 0.98 : 0.95 },
              { rotateX: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: '.dash-wrap', start: 'top 80%', end: 'top 15%', scrub: 0.6 } },
            );
            gsap.to('.dash-glow', { opacity: 1, scale: 1.08, ease: 'none', scrollTrigger: { trigger: '.dash-wrap', start: 'top 80%', end: 'top 15%', scrub: true } });
            // KPI figures count up once, as the product lands
            q('[data-count]', dash).forEach((el, i) => {
              const end = Number(el.dataset.count);
              const obj = { v: 0 };
              gsap.to(obj, {
                v: end,
                duration: 1.8,
                delay: 0.9 + i * 0.12,
                ease: 'power3.out',
                onUpdate: () => {
                  el.textContent = Math.round(obj.v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
                },
              });
            });
          }

        });
        await pause();
        ctx.add(() => {
          // Parallax helpers
          q('[data-speed]').forEach((el) => {
            const speed = parseFloat(el.dataset.speed || '0');
            gsap.fromTo(el, { y: () => -speed * 100 }, { y: () => speed * 100, ease: 'none', scrollTrigger: { trigger: el.parentElement ?? el, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } });
          });

          // Strike-through of "before" pains, scrubbed
          q('[data-scrub="strike"]').forEach((el) => {
            gsap.fromTo(el, { backgroundSize: '0% 2px' }, { backgroundSize: '100% 2px', ease: 'none', scrollTrigger: { trigger: el, start: 'top 82%', end: 'top 52%', scrub: 0.6, onLeave: () => el.closest('tr')?.classList.add('is-done'), onEnterBack: () => el.closest('tr')?.classList.remove('is-done') } });
          });

          // Bilingual wipe
          const wipe = document.querySelector('[data-scrub="wipe"]');
          if (wipe) {
            const [a, b] = q('span', wipe);
            const tl = gsap.timeline({ scrollTrigger: { trigger: wipe, start: 'top 85%', end: 'top 30%', scrub: 0.8 } });
            tl.fromTo(a, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', ease: 'none' })
              .fromTo(b, { clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', ease: 'none' }, '<0.35');
          }

        });
        await pause();
        ctx.add(() => {
          // SVG line drawing (zellige rosettes)
          q('[data-scrub="draw"]').forEach((svg) => {
            const paths = q<SVGPathElement>('path, polygon, circle', svg);
            gsap.fromTo(paths, { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: 'none', stagger: 0.08, scrollTrigger: { trigger: svg.closest('section') ?? svg, start: 'top 80%', end: 'bottom 40%', scrub: 1 } });
            gsap.to(svg, { rotate: rtl ? -25 : 25, ease: 'none', scrollTrigger: { trigger: svg.closest('section') ?? svg, start: 'top bottom', end: 'bottom top', scrub: true } });
          });

          // Line that grows across the steps
          q('[data-scrub="line"]').forEach((el) => {
            gsap.fromTo(el, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: el.parentElement ?? el, start: 'top 75%', end: 'bottom 55%', scrub: 0.8 } });
          });
          q('[data-scrub="steps"] > li').forEach((li, i) => {
            gsap.fromTo(li, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', delay: i * 0.12, scrollTrigger: { trigger: li.parentElement!, start: 'top 80%', once: true } });
          });

          // Footer wordmark letters
          const mark = document.querySelector('[data-scrub="wordmark"]');
          if (mark) {
            gsap.fromTo(q('span', mark), { yPercent: 105 }, { yPercent: 0, duration: 1.4, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: mark, start: 'top 98%', once: true } });
          }

          // Device float in the apps showcase
          const device = document.querySelector('.device');
          if (device) {
            gsap.fromTo(device, { rotateX: 14, y: 60 }, { rotateX: 0, y: 0, ease: 'none', scrollTrigger: { trigger: '.show', start: 'top bottom', end: 'top 30%', scrub: 1 } });
          }

        });
        await pause();
        ctx.add(() => {
          // Pointer-only niceties
          mm.add('(pointer: fine)', () => {
            const offs: (() => void)[] = [];
            q('[data-tilt]').forEach((card) => {
              const rx = gsap.quickTo(card, 'rotateX', { duration: 0.6, ease: 'power3' });
              const ry = gsap.quickTo(card, 'rotateY', { duration: 0.6, ease: 'power3' });
              gsap.set(card, { transformPerspective: 900 });
              const move = (e: PointerEvent) => {
                const r = card.getBoundingClientRect();
                const x = (e.clientX - r.left) / r.width - 0.5;
                const y = (e.clientY - r.top) / r.height - 0.5;
                rx(-y * 7);
                ry(x * 9);
                card.style.setProperty('--mx', `${e.clientX - r.left}px`);
                card.style.setProperty('--my', `${e.clientY - r.top}px`);
              };
              const leave = () => { rx(0); ry(0); };
              card.addEventListener('pointermove', move);
              card.addEventListener('pointerleave', leave);
              offs.push(() => { card.removeEventListener('pointermove', move); card.removeEventListener('pointerleave', leave); });
            });
            q('[data-magnetic]').forEach((btn) => {
              const x = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3' });
              const y = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3' });
              const move = (e: PointerEvent) => {
                const r = btn.getBoundingClientRect();
                x((e.clientX - (r.left + r.width / 2)) * 0.25);
                y((e.clientY - (r.top + r.height / 2)) * 0.35);
              };
              const leave = () => { x(0); y(0); };
              btn.addEventListener('pointermove', move);
              btn.addEventListener('pointerleave', leave);
              offs.push(() => { btn.removeEventListener('pointermove', move); btn.removeEventListener('pointerleave', leave); });
            });
            return () => offs.forEach((f) => f());
          });
        });

        // Fonts or images can change layout after load
        const refresh = () => ScrollTrigger.refresh();
        document.fonts?.ready.then(refresh);
        window.addEventListener('load', refresh, { once: true });

        cleanup = () => {
          document.removeEventListener('click', onAnchor);
          stageTriggers.forEach((t) => t.kill());
          mm.revert();
          ctx.revert();
          gsap.ticker.remove(tick);
          lenis.destroy();
        };
      } catch {
        root.classList.remove('motion');
      }
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return null;
}
