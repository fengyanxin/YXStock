import { createContext, useContext, type ReactNode } from 'react';

export interface AuthUser {
  id: string;
  name: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** Reserved — no-op in MVP */
  login: (token?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const value: AuthContextValue = {
    user: null,
    isAuthenticated: false,
    async login() {
      /* future: exchange token, set user */
    },
    async logout() {
      /* future: clear session */
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Placeholder for routes that will require login later */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
