import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ icon: Icon, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '0.75rem',
      padding: '0.75rem 1.25rem',
      borderRadius: '1rem',
      background: 'rgba(255,255,255,0.72)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(226,232,240,0.6)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)',
      overflow: 'hidden',
      gap: '1rem',
      flexWrap: 'wrap',
    }}>

      {/* Decorative circles */}
      <div style={{
        position: 'absolute',
        top: '-1.5rem',
        right: '4rem',
        width: '5rem',
        height: '5rem',
        borderRadius: '9999px',
        background: 'radial-gradient(circle, rgba(35,90,228,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-2rem',
        right: '1rem',
        width: '7rem',
        height: '7rem',
        borderRadius: '9999px',
        background: 'radial-gradient(circle, rgba(26,71,184,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Left: icon + text */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
        {/* Icon box */}
        <div style={{
          position: 'relative',
          flexShrink: 0,
          width: '3rem',
          height: '3rem',
          borderRadius: '0.875rem',
          background: 'linear-gradient(135deg, #235ae4 0%, #1a47b8 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(35,90,228,0.35), 0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <Icon style={{ width: '1.375rem', height: '1.375rem', color: '#ffffff' }} strokeWidth={2} />
          {/* Inner shine */}
          <div style={{
            position: 'absolute',
            top: '2px',
            left: '4px',
            width: '40%',
            height: '35%',
            background: 'rgba(255,255,255,0.3)',
            borderRadius: '50%',
            filter: 'blur(3px)',
            pointerEvents: 'none',
          }} />
        </div>

        {/* Title + subtitle */}
        <div style={{ minWidth: 0 }}>
          <h1 style={{
            margin: 0,
            fontSize: '1.375rem',
            fontWeight: 800,
            color: '#0f172a',
            letterSpacing: '-0.025em',
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{
              margin: 0,
              marginTop: '0.25rem',
              fontSize: '0.8125rem',
              color: '#64748b',
              fontWeight: 500,
              lineHeight: 1.4,
            }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right: actions */}
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  );
}
