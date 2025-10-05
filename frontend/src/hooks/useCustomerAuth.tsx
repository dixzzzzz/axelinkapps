import { useState, useEffect } from 'react';
import { apiClient } from '@/config/api';
import '@/utils/csrf'; // Ensure CSRF interceptors are loaded

interface CustomerUser {
  phone: string;
  email?: string;
  name: string;
  isFirstLogin?: boolean;
  deviceData?: any;
  status?: 'active' | 'inactive' | 'suspended';
  connectionStatus?: 'online' | 'offline';
}

type AuthStep = 'phone' | 'otp' | 'authenticated';

interface UseCustomerAuthReturn {
  user: CustomerUser | null;
  isAuthenticated: boolean;
  authStep: AuthStep;
  pendingPhone: string | null;
  sendOTP: (phone: string) => Promise<void>;
  verifyOTP: (phone: string, otp: string) => Promise<void>;
  login: (phone: string, email?: string) => Promise<void>; // Legacy method
  logout: () => Promise<void>;
  loading: boolean;
  error: string | null;
  resetAuth: () => void;
}

interface UseCustomerAuthOptions {
  skipInitialCheck?: boolean;
}

export const useCustomerAuth = (options?: UseCustomerAuthOptions): UseCustomerAuthReturn => {
  // Initialize state from localStorage first in development
  const initializeState = () => {
    if (import.meta.env.DEV) {
      const devSession = localStorage.getItem('dev_customer_session');
      if (devSession) {
        try {
          const sessionData = JSON.parse(devSession);
          return {
            user: sessionData,
            authStep: 'authenticated' as AuthStep,
            loading: false
          };
        } catch (e) {
          console.warn('⚠️ Invalid stored session, clearing...');
          localStorage.removeItem('dev_customer_session');
        }
      }
    }
    return {
      user: null,
      authStep: 'phone' as AuthStep,
      loading: !options?.skipInitialCheck // don't show initial loading if we skip
    };
  };

  const initialState = initializeState();
  
  const [user, setUser] = useState<CustomerUser | null>(initialState.user);
  const [loading, setLoading] = useState(initialState.loading);
  const [error, setError] = useState<string | null>(null);
  const [authStep, setAuthStep] = useState<AuthStep>(initialState.authStep);
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);

  // Check authentication on mount - only once and only if needed
  useEffect(() => {
    // Skip initial check if requested
    if (options?.skipInitialCheck) {
      return;
    }

    // If already initialized from localStorage, don't run checkAuth
    if (initialState.user && initialState.authStep === 'authenticated') {
      return;
    }
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Prefer localStorage in dev
      if (import.meta.env.DEV) {
        const devSession = localStorage.getItem('dev_customer_session');
        if (devSession) {
          try {
            const sessionData = JSON.parse(devSession);
            setUser(sessionData);
            setAuthStep('authenticated');
            setLoading(false);
            return;
          } catch {}
        }
      }

      // Ask backend if session exists
      setLoading(true);
      const data = await apiClient.customerDashboard(); // GET /api/customer/dashboard
      if (data?.success) {
        // Build a minimal user from dashboard data if not provided
        const phoneFromSession = data?.data?.customerPhone || data?.data?.phone;
        if (phoneFromSession) {
          setUser({ phone: phoneFromSession, name: `Customer ${phoneFromSession}` });
          setAuthStep('authenticated');
          setLoading(false);
          return;
        }
      }

      // Not authenticated
      setUser(null);
      setAuthStep('phone');
    } catch (e) {
      // 401 or error → treat as not authenticated
      setUser(null);
      setAuthStep('phone');
    } finally {
      setLoading(false);
    }
  };

  const login = async (phone: string, email?: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiClient.customerLogin(phone);

      if (data.success && data.user) {
        console.log('✅ Customer login successful:', data.user);
        setUser(data.user);
        setError(null);
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      console.error('❌ Customer login error:', errorMessage);
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
      await apiClient.customerLogout();
      console.log('✅ Customer logout successful');
    } catch (error) {
      console.error('❌ Customer logout error:', error);
    } finally {
      // Clear development session if exists
      if (import.meta.env.DEV) {
        localStorage.removeItem('dev_customer_session');
      }
      
      setUser(null);
      setError(null);
      setAuthStep('phone');
      setPendingPhone(null);
      setLoading(false);
    }
  };

  const sendOTP = async (phone: string) => {
    setLoading(true);
    setError(null);
    setPendingPhone(phone);

    try {
      console.log('📱 Sending OTP to:', phone);
      
      // Call dedicated OTP send endpoint
      const data = await apiClient.customerSendOTP(phone);

      if (data.success) {
        console.log('✅ OTP sent successfully via WhatsApp to:', phone);
        console.log('📱 WhatsApp available:', data.data?.whatsappAvailable);
        
        setAuthStep('otp');
        setError(null);
        
        // Development helper
        if (import.meta.env.DEV && data.data?.otp) {
          console.log('🔧 Development OTP code:', data.data.otp);
        }
        
      } else {
        throw new Error(data.message || 'Customer not found or unable to send OTP');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send OTP';
      console.error('❌ Send OTP error:', errorMessage);
      
      setError(errorMessage);
      setAuthStep('phone');
      setPendingPhone(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (phone: string, otp: string) => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔐 Verifying OTP for:', phone);
      const data = await apiClient.customerVerifyOTP(phone, otp);

      if (data.success && data.user) {
        console.log('✅ OTP verified successfully for:', phone);
        console.log('👤 User data received:', data.user);
        
        // Use user object from backend response
        const user = data.user;
        
        // Store session in localStorage for development
        if (import.meta.env.DEV) {
          localStorage.setItem('dev_customer_session', JSON.stringify(user));
        }
        
        setUser(user);
        setAuthStep('authenticated');
        setPendingPhone(null);
        setError(null);
      } else {
        throw new Error(data.message || 'Invalid OTP');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'OTP verification failed';
      console.error('❌ Verify OTP error:', errorMessage);
      
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetAuth = () => {
      // Clear development session if exists
      if (import.meta.env.DEV) {
        localStorage.removeItem('dev_customer_session');
      }
    
    setUser(null);
    setAuthStep('phone');
    setPendingPhone(null);
    setError(null);
    setLoading(false);
  };

  const isAuthenticated = !!user;

  return {
    user,
    isAuthenticated,
    authStep,
    pendingPhone,
    sendOTP,
    verifyOTP,
    login, // Legacy method
    logout,
    loading,
    error,
    resetAuth
  };
};
