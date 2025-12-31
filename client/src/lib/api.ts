const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

async function http<T>(url: string): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${url}`, {
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`HTTP error! status: ${res.status}, body: ${errorBody}`);
    }

    return res.json();
}

export const api = {
  getProducts: (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
  }) => {
    const q = new URLSearchParams(
      Object.entries(params ?? {}).filter(([, v]) => v !== undefined) as any
    ).toString();

    return http<any[]>(`/api/products${q ? `?${q}` : ""}`);
  },
};
