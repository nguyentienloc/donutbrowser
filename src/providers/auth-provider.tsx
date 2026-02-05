"use client";

import { invoke } from "@tauri-apps/api/core";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  username: string | null;
  login: (
    baseUrl: string,
    login: string,
    pass: string,
  ) => Promise<{ session_id?: string; name?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const loggedIn = await invoke<boolean>("is_odoo_logged_in");
        setIsLoggedIn(loggedIn);

        if (loggedIn) {
          const storedUsername = localStorage.getItem("odoo_username");
          if (storedUsername) {
            setUsername(storedUsername);
          }
        }

        if (!loggedIn && pathname !== "/login") {
          router.push("/login");
          localStorage.removeItem("odoo_username");
        } else if (loggedIn && pathname === "/login") {
          router.push("/");
        }
      } catch (error) {
        console.error("Failed to check auth status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void checkAuth();
  }, [pathname, router]);

  const login = async (baseUrl: string, loginEmail: string, pass: string) => {
    const result = await invoke<{
      session_id?: string;
      name?: string;
      login?: string;
    }>("odoo_login", {
      baseUrl,
      login: loginEmail,
      password: pass,
    });
    setIsLoggedIn(true);
    const name = result.name || result.login || loginEmail;
    setUsername(name);
    localStorage.setItem("odoo_username", name);
    router.push("/");
    return result;
  };

  const logout = async () => {
    await invoke("odoo_logout");
    setIsLoggedIn(false);
    setUsername(null);
    localStorage.removeItem("odoo_username");
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, isLoading, username, login, logout }}
    >
      {!isLoading ? (
        children
      ) : (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
