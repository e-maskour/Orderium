const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export async function http<T>(url: string, options?: RequestInit): Promise<T> {
    // Get auth token from localStorage
    const token = localStorage.getItem('orderium_token');
    
    const res = await fetch(`${API_BASE_URL}${url}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options?.headers,
        },
        ...options,
    });

    if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`HTTP error! status: ${res.status}, body: ${errorBody}`);
    }

    return res.json();
}

export { API_BASE_URL };
