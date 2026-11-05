
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import api from "../lib/api";

export interface PaceOrbitUser {
  id: string;
  name: string;
  email: string;
  location?: string | null;
  bio?: string | null;
  photoUrl?: string | null;
}

interface AuthContextType {
  user: PaceOrbitUser | null;
  loading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;

  register: (
    name: string,
    email: string,
    password: string
  ) => Promise<void>;

  updateProfile: (
    data: Partial<PaceOrbitUser>
  ) => Promise<void>;

  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PaceOrbitUser | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem("paceorbit_token");
    setUser(null);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post("/auth/login", {
      email,
      password,
    });

    localStorage.setItem("paceorbit_token", response.data.token);
    setUser(response.data.user);
  };

  const register = async (
    name: string,
    email: string,
    password: string
  ) => {
    const response = await api.post("/auth/register", {
      name,
      email,
      password,
    });

    localStorage.setItem("paceorbit_token", response.data.token);
    setUser(response.data.user);
  };

  // Update profile in Neon PostgreSQL
  const updateProfile = async (
    data: Partial<PaceOrbitUser>
  ) => {
    const response = await api.patch("/auth/me", data);
    setUser(response.data.user);
  };

  // Restore existing login session
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem("paceorbit_token");

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get("/auth/me");
        setUser(response.data.user);
      } catch {
        localStorage.removeItem("paceorbit_token");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        login,
        register,
        updateProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
