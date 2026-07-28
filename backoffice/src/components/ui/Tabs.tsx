/**
 * Tabs — controlled, accessible tab bar.
 *
 * A lightweight generic tab strip (not page navigation — see ModuleTabBar for
 * that). Renders an underline-style active state using brand tokens, with
 * proper tablist/tab roles and keyboard-visible focus.
 */
import type { ReactNode } from 'react';
import { cx } from './cx';

export interface TabItem {
  key: string;
  label: ReactNode;
  /** Optional leading icon node (lucide). */
  icon?: ReactNode;
  /** Optional trailing count pill. */
  count?: number;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
  ariaLabel?: string;
}

export function Tabs({ tabs, activeKey, onChange, className, ariaLabel }: TabsProps) {
  return (
    <div className={cx('ui-tabs', className)} role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={tab.disabled}
            className={cx('ui-tab', active && 'ui-tab--active')}
            onClick={() => onChange(tab.key)}
          >
            {tab.icon != null && (
              <span className="ui-tab__icon" aria-hidden="true">
                {tab.icon}
              </span>
            )}
            {tab.label}
            {tab.count != null && <span className="ui-tab__count">{tab.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
