import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  quickLogin: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('civicpulse_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchMe = async () => {
      const storedToken = localStorage.getItem('civicpulse_token');
      if (storedToken) {
        try {
          const userData = await api.getCurrentUser();
          setUser(userData);
        } catch (err) {
          console.error("Token verification failed, clearing auth:", err);
          localStorage.removeItem('civicpulse_token');
          setToken(null);
          setUser(null);
        }
      } else {
        // Auto demo-login as Admin for seamless hackathon exploration if not logged in
        try {
          const res = await api.login({
            email: 'admin@civicpulse.chandigarh.gov.in',
            password: 'Admin@123'
          });
          localStorage.setItem('civicpulse_token', res.access_token);
          setToken(res.access_token);
          setUser(res.user);
        } catch (e) {
          console.log("Auto-login fallback skipped.");
        }
      }
      setIsLoading(false);
    };

    fetchMe();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login({ email, password });
      localStorage.setItem('civicpulse_token', res.access_token);
      setToken(res.access_token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('civicpulse_token');
    setToken(null);
    setUser(null);
  };

  const quickLogin = async (email: string, password: string) => {
    await login(email, password);
  };

  return (
    <AuthContext.Provider value={{ user, token, role: user?.role || null, isLoading, login, logout, quickLogin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
