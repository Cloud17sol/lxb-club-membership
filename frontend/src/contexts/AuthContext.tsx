// @ts-nocheck
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '@/apiConfig';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: any) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        try {
          const response = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${savedToken}` }
          });
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            setToken(savedToken);
          } else {
            localStorage.removeItem('token');
            setToken(null);
          }
        } catch (error) {
          console.error('Auth init error:', error);
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    // Use axios (XHR) instead of fetch so dev tooling cannot consume the Response body before we read it.
    try {
      const { data } = await axios.post(`${API_URL}/auth/login`, { email, password });

      if (!data?.user || !data?.access_token) {
        throw new Error('Invalid username or password');
      }

      setUser(data.user);
      setToken(data.access_token);
      localStorage.setItem('token', data.access_token);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (!err.response) {
          throw new Error('Unable to connect. Please try again.');
        }
        throw new Error('Invalid username or password');
      }
      throw err;
    }
  };

  const signup = async (signupData: any) => {
    try {
      const { data } = await axios.post(`${API_URL}/auth/signup`, signupData);

      if (!data?.user || !data?.access_token) {
        throw new Error('Signup failed');
      }

      setUser(data.user);
      setToken(data.access_token);
      localStorage.setItem('token', data.access_token);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (!err.response) {
          throw new Error('Unable to connect. Please try again.');
        }
        const detail = err.response?.data?.detail;
        const msg =
          typeof detail === 'string'
            ? detail
            : Array.isArray(detail) && detail[0]?.msg
              ? detail[0].msg
              : 'Signup failed';
        throw new Error(msg);
      }
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
