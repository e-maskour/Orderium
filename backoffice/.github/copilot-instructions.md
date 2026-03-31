# Morocom Backoffice — Copilot Instructions

> React + Vite + TypeScript + PrimeReact — Admin Dashboard
> Inherits root `.github/copilot-instructions.md`

## Stack Details
- UI: PrimeReact + PrimeFlex + PrimeIcons
- State: React Context API (no Redux)
- Forms: Controlled components (useState) or custom hooks
- HTTP: `apiClient` from `../../common` (axios wrapper)
- Build: Vite

## Quick Checklists

### Adding a new frontend module
1. Create folder `src/modules/<name>/`
2. Add `<name>.interface.ts` — IModel, CreateDTO, UpdateDTO, ListResponse interfaces
3. Add `<name>.model.ts` — class with constructor + static `fromApiResponse(data)`
4. Add `<name>.service.ts` — class with async methods + export singleton `const featureService = new FeatureService()`
5. Register API routes in `src/common/api/` routes file
6. Add `index.ts` barrel: `export * from './<name>.interface'; export * from './<name>.model'; export * from './<name>.service';`

### Adding a new page
1. Create `src/pages/<Name>Page.tsx`
2. Register in router
3. Use `useRef`, `useState`, `useCallback` — avoid inline arrow functions in JSX

## Component Conventions

### List Page (DataTable pattern)
```tsx
import { useState, useCallback, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { featureService, Feature } from '../../modules/feature';

export function FeatureListPage() {
  const toast = useRef<Toast>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 50;

  const loadFeatures = useCallback(async () => {
    setLoading(true);
    try {
      const { features: data, pagination } = await featureService.getFeatures({ page, limit });
      setFeatures(data);
      setTotalRecords(pagination?.total ?? 0);
    } catch {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Failed to load features' });
    } finally {
      setLoading(false);
    }
  }, [page]);

  return (
    <>
      <Toast ref={toast} />
      <DataTable value={features} loading={loading} paginator rows={limit} totalRecords={totalRecords} lazy>
        <Column field="id" header="ID" />
        <Column field="name" header="Name" />
      </DataTable>
    </>
  );
}
```

### Form (create/edit)
```tsx
import { useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { CreateFeatureDTO } from '../../modules/feature';

interface Props {
  onSuccess: () => void;
}

export function FeatureForm({ onSuccess }: Props) {
  const [form, setForm] = useState<CreateFeatureDTO>({ name: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await featureService.createFeature(form);
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <InputText value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      <Button type="submit" label="Save" loading={loading} />
    </form>
  );
}
```

## Rules
- **No `any`** except in `fromApiResponse()` static methods
- Use **PrimeReact** components — not raw HTML inputs
- All API calls through `featureService` — no direct `apiClient` calls in components
- Always handle loading + error states
- Use `useCallback` for functions passed as props or used in `useEffect` deps
- Export singleton service: `export const featureService = new FeatureService();`
