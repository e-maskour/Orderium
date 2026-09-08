import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from 'primereact/button';

interface DocPageHeaderProps {
  /** Icon rendered inside the gradient tile. */
  icon: ReactNode;
  /** Breadcrumb parent label, e.g. "Produits". */
  parentLabel: string;
  /** Current record label shown after the separator, e.g. a code. */
  currentLabel: string;
  title: string;
  /** Called by the back button and the breadcrumb parent. */
  onBack: () => void;
  backAriaLabel: string;
  /** Status pills and other trailing badges. */
  badges?: ReactNode;
}

/**
 * Document-style page header — the same treatment the orders detail page
 * uses (`.doc-detail-hdr`), extracted into a shared component styled from
 * theme.css instead of an injected <style> block.
 *
 * Distinct from `PageHeader`, which is the list-page header used across
 * the rest of the app.
 */
export function DocPageHeader({
  icon,
  parentLabel,
  currentLabel,
  title,
  onBack,
  backAriaLabel,
  badges,
}: DocPageHeaderProps) {
  return (
    <header className="doc-hdr">
      <Button
        type="button"
        className="doc-hdr__back"
        onClick={onBack}
        aria-label={backAriaLabel}
        icon={<ArrowLeft size={16} aria-hidden="true" />}
      />

      <div className="doc-hdr__icon" aria-hidden="true">
        {icon}
      </div>

      <div className="doc-hdr__body">
        <nav className="doc-hdr__crumb" aria-label={parentLabel}>
          <button type="button" className="doc-hdr__crumb-parent" onClick={onBack}>
            {parentLabel}
          </button>
          <span className="doc-hdr__crumb-sep" aria-hidden="true">
            ›
          </span>
          <span className="doc-hdr__crumb-current">{currentLabel}</span>
        </nav>
        <h1 className="doc-hdr__title">{title}</h1>
      </div>

      {badges && <div className="doc-hdr__badges">{badges}</div>}
    </header>
  );
}
