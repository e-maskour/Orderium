import { useState, useEffect, useRef, useCallback } from 'react';
import { Save, CheckCircle, XCircle, MoreHorizontal, ChevronDown, Eye, FileDown, PenTool, Truck, Ban, Share2, FileText, Trash2, History, X } from 'lucide-react';
import { Button } from 'primereact/button';
import { useLanguage } from '../../context/LanguageContext';

export interface DocumentAction {
    id: string;
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
    destructive?: boolean;
    /** hide the action entirely */
    hidden?: boolean;
}

export interface DocumentActionBarProps {
    /** Primary action (rightmost solid button) — typically Save */
    primary?: DocumentAction | null;
    /** Secondary action (outlined) — typically Validate/Devalidate/Sign */
    secondary?: DocumentAction | null;
    /** Overflow actions shown in "More" menu */
    overflow?: DocumentAction[];
    /** Left-side action (e.g. Payment History for invoices) */
    leftAction?: DocumentAction | null;
}

export default function DocumentActionBar({ primary, secondary, overflow = [], leftAction }: DocumentActionBarProps) {
    const { t } = useLanguage();
    const [menuOpen, setMenuOpen] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const sheetRef = useRef<HTMLDivElement>(null);

    const visibleOverflow = overflow.filter(a => !a.hidden);
    const hasOverflow = visibleOverflow.length > 0;

    // Close desktop popover on outside click
    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuOpen]);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setMenuOpen(false);
                setSheetOpen(false);
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    // Lock body scroll when sheet is open
    useEffect(() => {
        if (sheetOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [sheetOpen]);

    const handleOverflowClick = useCallback((action: DocumentAction) => {
        setMenuOpen(false);
        setSheetOpen(false);
        action.onClick();
    }, []);

    const normalActions = visibleOverflow.filter(a => !a.destructive);
    const destructiveActions = visibleOverflow.filter(a => a.destructive);

    return (
        <>
            <style>{`
        .doc-action-bar{position:fixed;bottom:0;left:var(--sidebar-width,0px);right:0;background:#fff;box-shadow:0 -1px 3px rgba(0,0,0,0.08);z-index:40;transition:left 0.25s cubic-bezier(0.4,0,0.2,1),right 0.25s cubic-bezier(0.4,0,0.2,1)}
        [dir="rtl"] .doc-action-bar{left:0;right:var(--sidebar-width,0px)}
        .doc-action-bar__inner{max-width:1600px;margin:0 auto;padding:0.625rem 1.5rem;display:flex;align-items:center;justify-content:space-between;min-height:56px;max-height:56px}
        .doc-action-bar__right{display:flex;align-items:center;gap:0.625rem}
        .doc-action-bar__left{display:flex;align-items:center;gap:0.625rem}

        /* Desktop overflow popover */
        .doc-overflow-popover{position:absolute;bottom:100%;right:0;margin-bottom:0.5rem;min-width:13rem;background:#fff;border-radius:0.5rem;box-shadow:0 20px 25px -5px rgb(0 0 0/0.1),0 8px 10px -6px rgb(0 0 0/0.1);border:1px solid #e2e8f0;z-index:50;overflow:hidden}
        .doc-overflow-item{display:flex;align-items:center;gap:0.625rem;width:100%;padding:0.625rem 0.875rem;font-size:0.875rem;font-weight:500;color:#334155;background:none;border:none;cursor:pointer;text-align:left}
        .doc-overflow-item:hover{background:#f8fafc}
        .doc-overflow-item:focus-visible{outline:2px solid #235ae4;outline-offset:-2px}
        .doc-overflow-item--destructive{color:#dc2626}
        .doc-overflow-item--destructive:hover{background:#fef2f2}
        .doc-overflow-divider{height:1px;background:#e2e8f0;margin:0.25rem 0}

        /* Uniform button height across the entire bar */
        .doc-action-bar .p-button{height:2.25rem !important;padding-top:0 !important;padding-bottom:0 !important}

        /* Primary button */
        .doc-btn-primary{background:linear-gradient(135deg,#235ae4,#1a47b8) !important;border:none !important;font-weight:700 !important;box-shadow:0 4px 12px rgba(35,90,228,0.35) !important;border-radius:0.5rem !important}
        .doc-btn-primary:disabled{opacity:0.5 !important;cursor:not-allowed !important}
        /* Secondary button */
        .doc-btn-secondary{background:transparent !important;border:1.5px solid #cbd5e1 !important;color:#334155 !important;font-weight:600 !important;border-radius:0.5rem !important}
        .doc-btn-secondary:hover:not(:disabled){border-color:#94a3b8 !important;background:#f8fafc !important}
        /* Ghost button (overflow trigger) */
        .doc-btn-ghost{background:transparent !important;border:1.5px solid #e2e8f0 !important;color:#64748b !important;font-weight:600 !important;border-radius:0.5rem !important}
        .doc-btn-ghost:hover{background:#f8fafc !important;border-color:#cbd5e1 !important}

        /* Mobile bottom sheet */
        .doc-sheet-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:100;opacity:0;transition:opacity 0.2s ease}
        .doc-sheet-backdrop--open{opacity:1}
        .doc-sheet{position:fixed;bottom:0;left:0;right:0;background:#fff;border-radius:1rem 1rem 0 0;z-index:101;transform:translateY(100%);transition:transform 0.25s cubic-bezier(0.32,0.72,0,1);max-height:70vh;overflow-y:auto;padding-bottom:env(safe-area-inset-bottom,0)}
        .doc-sheet--open{transform:translateY(0)}
        .doc-sheet__handle{width:2rem;height:0.25rem;background:#cbd5e1;border-radius:9999px;margin:0.5rem auto 0.25rem}
        .doc-sheet-item{display:flex;align-items:center;gap:0.75rem;width:100%;padding:0.875rem 1.25rem;font-size:0.9375rem;font-weight:500;color:#334155;background:none;border:none;cursor:pointer;text-align:left;min-height:48px}
        .doc-sheet-item:active{background:#f1f5f9}
        .doc-sheet-item--destructive{color:#dc2626}
        .doc-sheet-divider{height:1px;background:#e2e8f0;margin:0.25rem 1.25rem}
        .doc-sheet-cancel{display:flex;align-items:center;justify-content:center;width:100%;padding:0.875rem 1.25rem;font-size:0.9375rem;font-weight:600;color:#64748b;background:none;border:none;border-top:1px solid #e2e8f0;cursor:pointer;min-height:48px}
        .doc-sheet-cancel:active{background:#f1f5f9}

        /* Responsive: mobile hides desktop trigger label, shows ⋯ icon only */
        .doc-overflow-label{display:inline}
        .doc-overflow-chevron{display:inline}
        .doc-overflow-dots{display:none}

        @media(max-width:1023px){
          .doc-action-bar__inner{padding:0.625rem 0.75rem}
          .doc-overflow-label{display:none}
          .doc-overflow-chevron{display:none}
          .doc-overflow-dots{display:inline}
          .doc-overflow-popover{display:none !important}
          .doc-action-bar__left-action-label{display:none}
        }
        @media(min-width:1024px){
          .doc-sheet-backdrop,.doc-sheet{display:none !important}
        }
      `}</style>

            {/* ══ Sticky Bar ══ */}
            <div className="doc-action-bar">
                <div className="doc-action-bar__inner">
                    {/* Left side */}
                    <div className="doc-action-bar__left">
                        {leftAction && !leftAction.hidden && (
                            <Button
                                icon={leftAction.icon}
                                label={leftAction.label}
                                onClick={leftAction.onClick}
                                severity="info"
                                className="doc-action-bar__left-action-label"
                            />
                        )}
                    </div>

                    {/* Right side */}
                    <div className="doc-action-bar__right">
                        {/* Overflow trigger */}
                        {hasOverflow && (
                            <div style={{ position: 'relative' }} ref={menuRef}>
                                <Button
                                    className="doc-btn-ghost"
                                    onClick={() => {
                                        // Desktop: popover, Mobile: bottom sheet
                                        if (window.innerWidth >= 768) {
                                            setMenuOpen(v => !v);
                                        } else {
                                            setSheetOpen(true);
                                        }
                                    }}
                                    aria-haspopup="true"
                                    aria-expanded={menuOpen}
                                >
                                    <span className="doc-overflow-dots"><MoreHorizontal size={18} /></span>
                                    <span className="doc-overflow-label" style={{ marginRight: '0.25rem' }}>{t('moreActions')}</span>
                                    <span className="doc-overflow-chevron"><ChevronDown size={14} /></span>
                                </Button>

                                {/* Desktop popover */}
                                {menuOpen && (
                                    <div className="doc-overflow-popover" role="menu">
                                        {normalActions.map(action => (
                                            <button
                                                key={action.id}
                                                className="doc-overflow-item"
                                                role="menuitem"
                                                disabled={action.disabled}
                                                onClick={() => handleOverflowClick(action)}
                                            >
                                                {action.icon}
                                                {action.label}
                                            </button>
                                        ))}
                                        {destructiveActions.length > 0 && normalActions.length > 0 && (
                                            <div className="doc-overflow-divider" />
                                        )}
                                        {destructiveActions.map(action => (
                                            <button
                                                key={action.id}
                                                className="doc-overflow-item doc-overflow-item--destructive"
                                                role="menuitem"
                                                disabled={action.disabled}
                                                onClick={() => handleOverflowClick(action)}
                                            >
                                                {action.icon}
                                                {action.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Secondary */}
                        {secondary && !secondary.hidden && (
                            <Button
                                className="doc-btn-secondary"
                                icon={secondary.icon}
                                label={secondary.label}
                                onClick={secondary.onClick}
                                disabled={secondary.disabled}
                                loading={secondary.loading}
                            />
                        )}

                        {/* Primary */}
                        {primary && !primary.hidden && (
                            <Button
                                className="doc-btn-primary"
                                icon={primary.icon}
                                label={primary.label}
                                onClick={primary.onClick}
                                disabled={primary.disabled}
                                loading={primary.loading}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* ══ Mobile Bottom Sheet ══ */}
            {sheetOpen && (
                <div
                    className={`doc-sheet-backdrop ${sheetOpen ? 'doc-sheet-backdrop--open' : ''}`}
                    onClick={() => setSheetOpen(false)}
                >
                    <div
                        className={`doc-sheet ${sheetOpen ? 'doc-sheet--open' : ''}`}
                        ref={sheetRef}
                        onClick={e => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className="doc-sheet__handle" />
                        {normalActions.map(action => (
                            <button
                                key={action.id}
                                className="doc-sheet-item"
                                disabled={action.disabled}
                                onClick={() => handleOverflowClick(action)}
                            >
                                {action.icon}
                                {action.label}
                            </button>
                        ))}
                        {destructiveActions.length > 0 && normalActions.length > 0 && (
                            <div className="doc-sheet-divider" />
                        )}
                        {destructiveActions.map(action => (
                            <button
                                key={action.id}
                                className="doc-sheet-item doc-sheet-item--destructive"
                                disabled={action.disabled}
                                onClick={() => handleOverflowClick(action)}
                            >
                                {action.icon}
                                {action.label}
                            </button>
                        ))}
                        <button className="doc-sheet-cancel" onClick={() => setSheetOpen(false)}>
                            {t('cancel')}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
