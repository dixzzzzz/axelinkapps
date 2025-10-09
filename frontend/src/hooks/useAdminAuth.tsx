import { useState, useEffect } from 'react';
import { apiClient } from '@/config/api';
import '@/utils/csrf'; // Ensure CSRF interceptors are loaded

interface AdminUser {
  username: string;
  role: string;
  loginTime?: string;
  sessionId?: string;
}

interface UseAdminAuthReturn {
  user: AdminUser | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  error: string | null;
  checkAuth: () => Promise<void>;
}

interface UseAdminAuthOptions {
  skipInitialCheck?: boolean;
}

export const useAdminAuth = (options?: UseAdminAuthOptions): UseAdminAuthReturn => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication status on mount (optional)
  useEffect(() => {
     if (options?.skipInitialCheck) {
       // Do not trigger verify on first render
       setLoading(false);
       return;
     }

     const timer = setTimeout(() => {
       checkAuth();
     }, 100); // Small delay to prevent immediate 401 error
 
     return () => clearTimeout(timer);
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const data = await apiClient.adminVerify();
      
      if (data.success && data.user) {
        // Normalize username to always be a string
        const normalizedUser = {
          ...data.user,
          username:
            typeof (data.user as any).username === 'object'
              ? (data.user as any).username?.username ?? ''
              : (data.user as any).username ?? ''
        } as any;
        setUser(normalizedUser);
        setError(null);
      } else {
        setUser(null);
      }
    } catch (error: any) {
      // Silence expected unauthenticated checks during initial load
      if (import.meta.env.DEV) {
        // Optional: minimal log in dev for visibility
        // console.debug('Admin not authenticated (initial check).');
      }
      setUser(null);
      setError(null); // Don't show error for initial auth check
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiClient.adminLogin(username, password);
      
      if (data.success && data.user) {
        console.log('✅ Admin login successful:', data.user);
        console.log('🔐 CSRF token received:', data.csrfToken ? 'Yes' : 'No');
        
        // Normalize username to always be a string
        const normalizedUser = {
          ...data.user,
          username:
            typeof (data.user as any).username === 'object'
              ? (data.user as any).username?.username ?? ''
              : (data.user as any).username ?? ''
        } as any;
        setUser(normalizedUser);
        setError(null);
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      console.error('❌ Admin login error:', errorMessage);
      setError(errorMessage);
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);

    try {
      await apiClient.adminLogout();
      console.log('✅ Admin logout successful');
    } catch (error: any) {
      console.error('❌ Admin logout error:', error);
      // Continue with logout even if API call fails
    } finally {
      setUser(null);
      setError(null);
      setLoading(false);
    }
  };

  return {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    loading,
    error,
    checkAuth
  };
};
