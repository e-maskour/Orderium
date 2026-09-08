import type { ReactNode } from 'react';

interface FormSectionProps {
  /** Stable id so the heading can label the section for screen readers. */
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * A labelled form section. Rendered as a real <section> with its heading
 * as the accessible name, so the grouping is exposed to assistive tech
 * and not just implied visually.
 */
export function FormSection({ id, title, description, children }: FormSectionProps) {
  const headingId = `${id}-heading`;

  return (
    <section className="pform-section" aria-labelledby={headingId}>
      <div className="pform-section__head">
        <h2 className="pform-section__title" id={headingId}>
          {title}
        </h2>
        {description && <p className="pform-section__desc">{description}</p>}
      </div>
      {children}
    </section>
  );
}
