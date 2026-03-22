import { useState, useCallback } from 'react'

const KEY = 'admin_key'

export function useAuth() {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
        () => Boolean(localStorage.getItem(KEY)),
    )

    const login = useCallback((key: string) => {
        localStorage.setItem(KEY, key)
        setIsAuthenticated(true)
    }, [])

    const logout = useCallback(() => {
        localStorage.removeItem(KEY)
        setIsAuthenticated(false)
    }, [])

    return { isAuthenticated, login, logout }
}
