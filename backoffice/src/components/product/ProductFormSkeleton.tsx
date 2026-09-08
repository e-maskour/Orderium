/**
 * Loading placeholder that mirrors the real section layout, so the page
 * does not reflow when data arrives. Replaces a spinner on a blank page.
 */

const line = (h: string, w: string, mbe = '0') => (
  <div
    className="pform-skel__line"
    style={{ blockSize: h, inlineSize: w, marginBlockEnd: mbe }}
    aria-hidden="true"
  />
);

function SkeletonSection({ fields }: { fields: number }) {
  return (
    <div className="pform-section">
      <div className="pform-section__head">
        {line('0.9375rem', '38%', '0.5rem')}
        {line('0.75rem', '58%')}
      </div>
      <div className="pform-grid">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i}>
            {line('0.8125rem', '30%', '0.5rem')}
            {line('2.75rem', '100%')}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductFormSkeleton() {
  return (
    <div className="pform-page" role="status" aria-busy="true">
      <span className="sr-only">Loading</span>
      <div className="pform-hdr">
        <div className="pform-hdr__body">
          {line('0.75rem', '9rem', '0.5rem')}
          {line('1.25rem', '17rem')}
        </div>
      </div>
      <SkeletonSection fields={3} />
      <SkeletonSection fields={2} />
      <SkeletonSection fields={2} />
    </div>
  );
}
