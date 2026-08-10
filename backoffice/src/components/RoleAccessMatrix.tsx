import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAccessLabels } from '../hooks/useAccessLabels';
import {
  groupModulesByCategory,
  levelForModule,
  permissionKey,
  permissionsForLevel,
  type AccessLevel,
  type AccessModule,
  type AccessRegistry,
  type DisplayedLevel,
} from '../modules/access';

interface RoleAccessMatrixProps {
  registry: AccessRegistry;
  /** Permission keys the role currently grants directly. */
  value: Set<string>;
  onChange: (next: Set<string>) => void;
  /** Keys inherited from implied roles — shown as granted but not editable. */
  inherited?: Set<string>;
  disabled?: boolean;
}

const LEVELS: AccessLevel[] = ['none', 'read', 'user', 'manager'];

const LEVEL_COLORS: Record<DisplayedLevel, string> = {
  none: '#94a3b8',
  read: '#0891b2',
  user: '#235ae4',
  manager: '#7c3aed',
  custom: '#d97706',
};

/**
 * Odoo's per-app access selector.
 *
 * Each module gets a None / Read / User / Manager choice, where a level is a
 * named bundle of actions defined by the server registry. Picking one writes
 * the whole bundle. The Advanced panel exposes the individual actions for the
 * cases a bundle does not cover — the selector then reads "Custom", which is
 * exactly how Odoo renders a group that has drifted from its preset.
 */
export const RoleAccessMatrix = ({
  registry,
  value,
  onChange,
  inherited,
  disabled = false,
}: RoleAccessMatrixProps) => {
  const { t } = useLanguage();
  const { categoryLabel, moduleLabel, moduleDescription, actionLabel } = useAccessLabels();
  const groups = useMemo(() => groupModulesByCategory(registry), [registry]);

  const [openCategories, setOpenCategories] = useState<Set<string>>(
    () => new Set(groups.slice(0, 1).map((g) => g.category.key)),
  );
  const [advancedModules, setAdvancedModules] = useState<Set<string>>(new Set());

  const toggleSet = <T,>(set: Set<T>, item: T): Set<T> => {
    const next = new Set(set);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    return next;
  };

  const setModuleLevel = (mod: AccessModule, level: AccessLevel) => {
    if (disabled) return;
    const next = new Set(value);
    for (const action of mod.actions) next.delete(permissionKey(mod.key, action.key));
    for (const key of permissionsForLevel(mod, level)) next.add(key);
    onChange(next);
  };

  const toggleAction = (mod: AccessModule, actionKey: string) => {
    if (disabled) return;
    onChange(toggleSet(value, permissionKey(mod.key, actionKey)));
  };

  const grantedCount = groups.reduce(
    (total, group) =>
      total + group.modules.filter((m) => levelForModule(m, value) !== 'none').length,
    0,
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
        {grantedCount === 0
          ? t('roleNoModulesGranted')
          : t('roleModulesGranted').replace('{count}', String(grantedCount))}
      </p>

      <div
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: '0.75rem',
          overflow: 'hidden',
        }}
      >
        {groups.map((group) => {
          const isOpen = openCategories.has(group.category.key);
          const activeInCategory = group.modules.filter(
            (m) => levelForModule(m, value) !== 'none',
          ).length;

          return (
            <div key={group.category.key}>
              <button
                type="button"
                onClick={() => setOpenCategories(toggleSet(openCategories, group.category.key))}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  background: '#f8fafc',
                  border: 'none',
                  borderBottom: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  textAlign: 'start',
                }}
              >
                {isOpen ? (
                  <ChevronDown size={16} style={{ color: '#64748b' }} />
                ) : (
                  <ChevronRight size={16} style={{ color: '#64748b' }} />
                )}
                <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#334155' }}>
                  {categoryLabel(group.category.key, group.category.label)}
                </span>
                {activeInCategory > 0 && (
                  <span
                    style={{
                      marginInlineStart: 'auto',
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      color: '#235ae4',
                      background: '#eff4ff',
                      borderRadius: '9999px',
                      padding: '0.1rem 0.5rem',
                    }}
                  >
                    {activeInCategory}
                  </span>
                )}
              </button>

              {isOpen &&
                group.modules.map((mod) => {
                  const level = levelForModule(mod, value);
                  const isAdvanced = advancedModules.has(mod.key);

                  return (
                    <div key={mod.key} className="ram-module">
                      <div className="ram-module__row">
                        <div className="ram-module__info">
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: '0.8125rem',
                              color: '#0f172a',
                            }}
                          >
                            {moduleLabel(mod.key, mod.label)}
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                            {moduleDescription(mod.key, mod.description)}
                          </div>
                        </div>

                        <div className="ram-levels">
                          {LEVELS.map((option) => {
                            // A module with no read bundle (e.g. Point of Sale)
                            // cannot offer a Read choice.
                            if (
                              option !== 'none' &&
                              permissionsForLevel(mod, option).length === 0
                            ) {
                              return null;
                            }
                            const selected = level === option;
                            return (
                              <button
                                key={option}
                                type="button"
                                className="ram-level-btn"
                                disabled={disabled}
                                onClick={() => setModuleLevel(mod, option)}
                                style={{
                                  cursor: disabled ? 'not-allowed' : 'pointer',
                                  border: `1.5px solid ${selected ? LEVEL_COLORS[option] : '#e2e8f0'}`,
                                  background: selected ? LEVEL_COLORS[option] : 'transparent',
                                  color: selected ? '#fff' : '#64748b',
                                  opacity: disabled ? 0.6 : 1,
                                }}
                              >
                                {t(
                                  `accessLevel${option.charAt(0).toUpperCase()}${option.slice(1)}` as Parameters<
                                    typeof t
                                  >[0],
                                )}
                              </button>
                            );
                          })}
                          {level === 'custom' && (
                            <span
                              style={{
                                alignSelf: 'center',
                                padding: '0.25rem 0.625rem',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                borderRadius: '0.5rem',
                                background: LEVEL_COLORS.custom,
                                color: '#fff',
                              }}
                            >
                              {t('accessLevelCustom')}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          className="ram-advanced-btn"
                          aria-expanded={isAdvanced}
                          onClick={() => setAdvancedModules(toggleSet(advancedModules, mod.key))}
                        >
                          {t('roleAdvancedActions')}
                        </button>
                      </div>

                      {isAdvanced && (
                        <div className="ram-actions">
                          {mod.actions.map((action) => {
                            const key = permissionKey(mod.key, action.key);
                            const checked = value.has(key);
                            const isInherited = !checked && inherited?.has(key);
                            return (
                              <button
                                key={action.key}
                                type="button"
                                className="ram-action-chip"
                                disabled={disabled}
                                title={
                                  isInherited
                                    ? `${actionLabel(action.key, action.label)} — ${t('roleImplied')}`
                                    : actionLabel(action.key, action.label)
                                }
                                onClick={() => toggleAction(mod, action.key)}
                                style={{
                                  cursor: disabled ? 'not-allowed' : 'pointer',
                                  border: `1.5px solid ${
                                    checked ? '#235ae4' : isInherited ? '#c7d2fe' : '#e2e8f0'
                                  }`,
                                  background: checked
                                    ? '#eff4ff'
                                    : isInherited
                                      ? '#f5f7ff'
                                      : 'transparent',
                                  color: checked ? '#235ae4' : isInherited ? '#818cf8' : '#64748b',
                                  fontStyle: isInherited ? 'italic' : undefined,
                                }}
                              >
                                {(checked || isInherited) && <Check size={12} strokeWidth={3} />}
                                {actionLabel(action.key, action.label)}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
