import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "support" | "ops" | "compliance" | "manager" | "admin";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  realRoles: AppRole[];
  impersonatedRoles: AppRole[] | null;
  setImpersonatedRoles: (roles: AppRole[] | null) => void;
  isImpersonating: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  isManagerOrAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const IMPERSONATION_KEY = "bankops:impersonated_roles";

const readImpersonation = (): AppRole[] | null => {
  try {
    const raw = sessionStorage.getItem(IMPERSONATION_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return null;
    return arr.filter((r): r is AppRole =>
      ["support", "ops", "compliance", "manager", "admin"].includes(r),
    );
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [realRoles, setRealRoles] = useState<AppRole[]>([]);
  const [impersonatedRoles, setImpersonatedRolesState] = useState<AppRole[] | null>(
    () => readImpersonation(),
  );
  const [loading, setLoading] = useState(true);

  const loadRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (error) {
      console.error("loadRoles error", error);
      setRealRoles([]);
      return;
    }
    setRealRoles((data ?? []).map((r) => r.role as AppRole));
  };

  useEffect(() => {
    // Set up listener FIRST
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        // defer to avoid deadlock inside callback
        setTimeout(() => loadRoles(newSession.user.id), 0);
      } else {
        setRealRoles([]);
        setImpersonatedRolesState(null);
        try { sessionStorage.removeItem(IMPERSONATION_KEY); } catch { /* ignore */ }
      }
    });

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      if (existing?.user) loadRoles(existing.user.id);
      setLoading(false);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try { sessionStorage.removeItem(IMPERSONATION_KEY); } catch { /* ignore */ }
    setImpersonatedRolesState(null);
    await supabase.auth.signOut();
  };

  const setImpersonatedRoles = (next: AppRole[] | null) => {
    setImpersonatedRolesState(next);
    try {
      if (next === null) sessionStorage.removeItem(IMPERSONATION_KEY);
      else sessionStorage.setItem(IMPERSONATION_KEY, JSON.stringify(next));
    } catch { /* ignore */ }
  };

  const roles = impersonatedRoles ?? realRoles;
  const isImpersonating = impersonatedRoles !== null;
  const isManagerOrAdmin = roles.includes("manager") || roles.includes("admin");

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        roles,
        realRoles,
        impersonatedRoles,
        setImpersonatedRoles,
        isImpersonating,
        loading,
        signOut,
        isManagerOrAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
