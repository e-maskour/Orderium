import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { apiClient, API_ROUTES, setUnauthorizedHandler } from '../common';
import { accessService, EMPTY_ACCESS } from '../modules/access';
import type { EffectiveAccess } from '../modules/access';

interface Admin {
  id: number;
  phoneNumber: string;
  name?: string;
  fullName?: string;
  isCustomer: boolean;
  isDelivery: boolean;
  isAdmin: boolean;
}

const normalizeAdmin = (raw: any): Admin | null => {
  if (!raw) return null;
  const isAdmin = raw.isAdmin ?? raw.IsAdmin;
  const isCustomer = raw.isCustomer ?? raw.IsCustomer ?? false;
  const isDelivery = raw.isDelivery ?? raw.IsDelivery ?? false;

  if (typeof raw.id !== 'number' || !raw.phoneNumber) return null;

  return {
    id: raw.id,
    phoneNumber: raw.phoneNumber,
    name: raw.name ?? raw.FullName,
    fullName: raw.fullName ?? raw.FullName,
    isAdmin: Boolean(isAdmin),
    isCustomer: Boolean(isCustomer),
    isDelivery: Boolean(isDelivery),
  };
};

const normalizeAccess = (raw: any): EffectiveAccess => ({
  userId: typeof raw?.userId === 'number' ? raw.userId : null,
  roleIds: Array.isArray(raw?.roleIds) ? raw.roleIds : [],
  roleNames: Array.isArray(raw?.roleNames) ? raw.roleNames : [],
  isSuperAdmin: Boolean(raw?.isSuperAdmin),
  permissions: Array.isArray(raw?.permissions) ? raw.permissions : [],
});

interface AuthContextType {
  admin: Admin | null;
  access: EffectiveAccess;
  login: (credentials: { phoneNumber: string; password: string }) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** True once the effective permission set has been fetched from the server. */
  isAccessLoaded: boolean;
  /** Re-fetch effective permissions — call after changing your own roles. */
  refreshAccess: () => Promise<void>;
  hasPermission: (key: string) => boolean;
  hasAnyPermission: (...keys: string[]) => boolean;
  hasAllPermissions: (...keys: string[]) => boolean;
  /** True when the user holds at least one permission on a module. */
  canAccessModule: (moduleKey: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_ADMIN = 'admin';
const STORAGE_TOKEN = 'adminToken';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [access, setAccess] = useState<EffectiveAccess>(EMPTY_ACCESS);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccessLoaded, setIsAccessLoaded] = useState(false);

  const clearSession = useCallback(() => {
    setAdmin(null);
    setAccess(EMPTY_ACCESS);
    setIsAuthenticated(false);
    setIsAccessLoaded(false);
    localStorage.removeItem(STORAGE_ADMIN);
    localStorage.removeItem(STORAGE_TOKEN);
  }, []);

  /**
   * Permissions always come from the server, never from the stored session.
   * A cached copy would go stale the moment an administrator edits a role,
   * which is the failure mode this whole design exists to avoid.
   */
  const refreshAccess = useCallback(async () => {
    try {
      const fresh = await accessService.getMyAccess();
      setAccess(normalizeAccess(fresh));
    } catch {
      // A failed refresh must not silently widen access.
      setAccess(EMPTY_ACCESS);
    } finally {
      setIsAccessLoaded(true);
    }
  }, []);

  useEffect(() => {
    const storedAdmin = localStorage.getItem(STORAGE_ADMIN);
    const storedToken = localStorage.getItem(STORAGE_TOKEN);
    if (!storedAdmin || !storedToken) {
      setIsLoading(false);
      return;
    }

    const parsed = normalizeAdmin(JSON.parse(storedAdmin));
    if (!parsed?.isAdmin) {
      clearSession();
      setIsLoading(false);
      return;
    }

    setAdmin(parsed);
    setIsAuthenticated(true);
    void refreshAccess().finally(() => setIsLoading(false));
  }, [clearSession, refreshAccess]);

  // Register the unauthorized handler so apiClient auto-logout triggers React state cleanup
  useEffect(() => {
    setUnauthorizedHandler(() => clearSession());
  }, [clearSession]);

  const login = async (credentials: { phoneNumber: string; password: string }) => {
    const data = await apiClient.post<any>(
      API_ROUTES.AUTH.LOGIN,
      { phoneNumber: credentials.phoneNumber, password: credentials.password },
      { skipAuth: true },
    );

    const normalized = normalizeAdmin(data.data?.user);

    // Verify it's an admin account
    if (!normalized?.isAdmin) {
      throw new Error('Access denied: Admin credentials required');
    }

    setAdmin(normalized);
    setIsAuthenticated(true);
    localStorage.setItem(STORAGE_ADMIN, JSON.stringify(normalized));
    localStorage.setItem(STORAGE_TOKEN, data.data?.token);

    // The login response carries a resolved snapshot; take it so the first
    // render is already gated, then confirm against the server.
    setAccess(normalizeAccess(data.data?.user));
    setIsAccessLoaded(true);
    await refreshAccess();
  };

  const logout = () => clearSession();

  const permissionSet = useMemo(() => new Set(access.permissions), [access.permissions]);

  const hasPermission = useCallback(
    (key: string) => access.isSuperAdmin || permissionSet.has(key),
    [access.isSuperAdmin, permissionSet],
  );

  const hasAnyPermission = useCallback(
    (...keys: string[]) =>
      access.isSuperAdmin || keys.length === 0 || keys.some((key) => permissionSet.has(key)),
    [access.isSuperAdmin, permissionSet],
  );

  const hasAllPermissions = useCallback(
    (...keys: string[]) => access.isSuperAdmin || keys.every((key) => permissionSet.has(key)),
    [access.isSuperAdmin, permissionSet],
  );

  const canAccessModule = useCallback(
    (moduleKey: string) => {
      if (access.isSuperAdmin) return true;
      const prefix = `${moduleKey}.`;
      return access.permissions.some((key) => key.startsWith(prefix));
    },
    [access.isSuperAdmin, access.permissions],
  );

  const value = useMemo<AuthContextType>(
    () => ({
      admin,
      access,
      login,
      logout,
      isAuthenticated,
      isLoading,
      isAccessLoaded,
      refreshAccess,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      canAccessModule,
    }),
    // `login`/`logout` are stable in practice; the rest drive re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      admin,
      access,
      isAuthenticated,
      isLoading,
      isAccessLoaded,
      refreshAccess,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      canAccessModule,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
