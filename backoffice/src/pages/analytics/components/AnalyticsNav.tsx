/**
 * AnalyticsNav — two-level navigation for the analytics module.
 *
 *  Level 1: domain tabs (Overview, Sales, Purchases, …). Each domain tab opens
 *           a menu listing that domain's reports with a short description.
 *  Level 2: report sub-tabs for the active domain (report pages only), so
 *           sibling reports are always one click away.
 *
 * The menu is portalled to <body> with fixed positioning so the horizontally
 * scrollable tab bar never clips it. Keyboard: ↓ / Enter opens, ↑ ↓ Home End
 * move, Esc closes and returns focus to the tab.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Check, ChevronDown, LayoutGrid, LayoutList } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import {
  ANALYTICS_DOMAINS,
  ANALYTICS_CATALOG,
  ANALYTICS_ROOT,
  findDomain,
  type AnalyticsDomain,
} from '../analytics.registry';

const MENU_WIDTH = 340;
const GUTTER = 16;

interface MenuPosition {
  top: number;
  left: number;
  width: number;
}

const DomainMenu: React.FC<{
  domain: AnalyticsDomain;
  anchor: HTMLElement;
  activePath: string;
  onClose: (restoreFocus: boolean) => void;
}> = ({ domain, anchor, activePath, onClose }) => {
  const { t } = useLanguage();
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<MenuPosition | null>(null);

  useLayoutEffect(() => {
    const place = () => {
      const r = anchor.getBoundingClientRect();
      const rtl = document.documentElement.dir === 'rtl' || document.body.dir === 'rtl';
      const width = Math.min(MENU_WIDTH, window.innerWidth - GUTTER * 2);
      let left = rtl ? r.right - width : r.left;
      left = Math.max(GUTTER, Math.min(left, window.innerWidth - width - GUTTER));
      setPos({ top: r.bottom + 6, left, width });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [anchor]);

  // Focus the active (or first) item once, after the first placement.
  const focusedRef = useRef(false);
  useEffect(() => {
    if (!pos || focusedRef.current) return;
    focusedRef.current = true;
    const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    if (!items?.length) return;
    const active = Array.from(items).find((el) => el.dataset.active === 'true');
    (active ?? items[0]).focus();
  }, [pos]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || anchor.contains(target)) return;
      onClose(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [anchor, onClose]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    const i = items.indexOf(document.activeElement as HTMLElement);
    const focusAt = (n: number) => items[(n + items.length) % items.length]?.focus();
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        focusAt(i + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        focusAt(i - 1);
        break;
      case 'Home':
        e.preventDefault();
        focusAt(0);
        break;
      case 'End':
        e.preventDefault();
        focusAt(items.length - 1);
        break;
      case 'Escape':
        e.preventDefault();
        onClose(true);
        break;
      case 'Tab':
        onClose(false);
        break;
    }
  };

  const DomainIcon = domain.icon;

  return createPortal(
    <div
      ref={menuRef}
      className={`ax-menu ax-accent--${domain.accent}`}
      role="menu"
      aria-label={t(domain.labelKey)}
      onKeyDown={onKeyDown}
      style={{
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        width: pos?.width ?? MENU_WIDTH,
        visibility: pos ? 'visible' : 'hidden',
      }}
    >
      <div className="ax-menu__head">
        <span className="ax-icon-tile ax-icon-tile--sm">
          <DomainIcon aria-hidden="true" />
        </span>
        <span className="ax-menu__title">{t(domain.labelKey)}</span>
        <span className="ax-menu__count">
          {t(
            domain.reports.length > 1
              ? 'analyticsReportCountPlural'
              : 'analyticsReportCountSingular',
          ).replace('{count}', String(domain.reports.length))}
        </span>
      </div>
      <div className="ax-menu__list">
        {domain.reports.map((report) => {
          const Icon = report.icon;
          const active = report.path === activePath;
          return (
            <Link
              key={report.path}
              to={report.path}
              role="menuitem"
              data-active={active}
              aria-current={active ? 'page' : undefined}
              className={`ax-menu__item${active ? ' ax-menu__item--active' : ''}`}
              onClick={() => onClose(false)}
            >
              <span className="ax-menu__item-icon">
                <Icon aria-hidden="true" />
              </span>
              <span className="ax-menu__item-text">
                <span className="ax-menu__item-title">{t(report.titleKey)}</span>
                <span className="ax-menu__item-desc">{t(report.descriptionKey)}</span>
              </span>
              {active && <Check className="ax-menu__item-check" aria-hidden="true" />}
            </Link>
          );
        })}
      </div>
    </div>,
    document.body,
  );
};

interface AnalyticsNavProps {
  /** Render the level-2 report tabs for the active domain. */
  showSubTabs?: boolean;
}

const AnalyticsNav: React.FC<AnalyticsNavProps> = ({ showSubTabs = true }) => {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const activeDomain = findDomain(pathname);
  const [open, setOpen] = useState<{ id: string; anchor: HTMLElement } | null>(null);
  const openId = open?.id ?? null;

  // Close the menu whenever navigation happens.
  useEffect(() => setOpen(null), [pathname]);

  const close = useCallback(
    (restoreFocus: boolean) => {
      if (restoreFocus) open?.anchor.focus();
      setOpen(null);
    },
    [open],
  );

  const openDomain = openId ? ANALYTICS_DOMAINS.find((d) => d.id === openId) : undefined;

  return (
    <div className="ax-nav">
      <div className="ax-nav__bar" role="menubar" aria-label={t('analyticsPageTitle')}>
        <NavLink
          to={ANALYTICS_ROOT}
          end
          className={({ isActive }) => `ax-nav__tab${isActive ? ' ax-nav__tab--active' : ''}`}
        >
          <LayoutGrid aria-hidden="true" />
          <span>{t('analyticsOverview')}</span>
        </NavLink>
        <span className="ax-nav__divider" aria-hidden="true" />
        {ANALYTICS_DOMAINS.map((domain) => {
          const Icon = domain.icon;
          const active = activeDomain?.id === domain.id;
          const isOpen = openId === domain.id;
          return (
            <button
              key={domain.id}
              type="button"
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={isOpen}
              className={`ax-nav__tab ax-accent--${domain.accent}${active ? ' ax-nav__tab--active' : ''}${isOpen ? ' ax-nav__tab--open' : ''}`}
              onClick={(e) => setOpen(isOpen ? null : { id: domain.id, anchor: e.currentTarget })}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' && !isOpen) {
                  e.preventDefault();
                  setOpen({ id: domain.id, anchor: e.currentTarget });
                }
              }}
            >
              <Icon aria-hidden="true" />
              <span>{t(domain.labelKey)}</span>
              <ChevronDown className="ax-nav__chevron" aria-hidden="true" />
            </button>
          );
        })}
        <span className="ax-nav__divider" aria-hidden="true" />
        <NavLink
          to={ANALYTICS_CATALOG}
          className={({ isActive }) => `ax-nav__tab${isActive ? ' ax-nav__tab--active' : ''}`}
        >
          <LayoutList aria-hidden="true" />
          <span>{t('analyticsAllReports')}</span>
        </NavLink>
      </div>

      {showSubTabs && activeDomain && (
        <nav
          className={`ax-subtabs ax-accent--${activeDomain.accent}`}
          aria-label={t(activeDomain.labelKey)}
        >
          {activeDomain.reports.map((report) => {
            const Icon = report.icon;
            return (
              <NavLink
                key={report.path}
                to={report.path}
                className={({ isActive }) =>
                  `ax-subtabs__tab${isActive ? ' ax-subtabs__tab--active' : ''}`
                }
              >
                <Icon aria-hidden="true" />
                <span>{t(report.titleKey)}</span>
              </NavLink>
            );
          })}
        </nav>
      )}

      {openDomain && open && (
        <DomainMenu
          domain={openDomain}
          anchor={open.anchor}
          activePath={pathname}
          onClose={close}
        />
      )}
    </div>
  );
};

export default AnalyticsNav;
