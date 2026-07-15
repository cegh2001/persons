import { useState, useEffect, useCallback } from "react";

export interface AuthUser {
  email: string;
  role: "admin" | "visor";
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setUser(data.user);
          return;
        }
      }
      setUser(null);
    } catch {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLoginSuccess = useCallback((userData: AuthUser) => {
    setUser(userData);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        setUser(null);
      }
    } catch (err) {
      console.error("Error logging out:", err);
    }
  }, []);

  return {
    user,
    authLoading,
    handleLoginSuccess,
    handleLogout,
  };
}
