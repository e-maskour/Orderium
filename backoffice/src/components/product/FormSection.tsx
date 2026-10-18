import type { ReactNode } from 'react';

export type FormSectionTone = 'blue' | 'green' | 'amber' | 'violet' | 'pink';

interface FormSectionProps {
  /** Stable id so the heading can label the section for screen readers. */
  id: string;
  title: string;
  description?: string;
  /** Icon shown in the tinted tile beside the heading. */
  icon?: ReactNode;
  tone?: FormSectionTone;
  className?: string;
  children: ReactNode;
}

/**
 * A labelled form card. Rendered as a real <section> with its heading
 * as the accessible name, so the grouping is exposed to assistive tech
 * and not just implied visually.
 */
export function FormSection({
  id,
  title,
  description,
  icon,
  tone = 'blue',
  className,
  children,
}: FormSectionProps) {
  const headingId = `${id}-heading`;

  return (
    <section
      className={`pform-section${className ? ` ${className}` : ''}`}
      aria-labelledby={headingId}
    >
      <div className="pform-section__head">
        {icon && (
          <span className={`pform-section__icon pform-section__icon--${tone}`} aria-hidden="true">
            {icon}
          </span>
        )}
        <div className="pform-section__heading">
          <h2 className="pform-section__title" id={headingId}>
            {title}
          </h2>
          {description && <p className="pform-section__desc">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
