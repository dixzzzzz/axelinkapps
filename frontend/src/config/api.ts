// API Configuration for AxeLink Backend Integration
// Use axios with CSRF interceptors for secure communication
import axios from 'axios';

// Import CSRF token manager to ensure interceptors are initialized
import '@/utils/csrf';

// Resolve API base URL for dev/preview/prod
const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || (import.meta as any).env?.VITE_API_URL || '/api';

// API Client using axios (with CSRF protection)
class ApiClient {
  constructor() {
    // Axios is configured globally in utils/csrf.ts
    // No need for per-instance configuration
  }

  // Admin API methods
  async adminLogin(username: string, password: string) {
    const response = await axios.post(`${API_BASE}/admin/login`, { username, password }, { withCredentials: true });
    return response.data;
  }

  async adminVerify() {
    // Accept 401 as a valid, non-exceptional response
    const response = await axios.get(`${API_BASE}/admin/verify`, {
      withCredentials: true,
      validateStatus: (status) => status < 500,
    });

    if (response.status === 401) {
      return { success: false } as any;
    }

    // Log only unexpected non-2xx statuses
    if (response.status < 200 || response.status >= 300) {
      console.warn('Admin verify API non-success status:', response.status);
    }

    return response.data;
  }

  async adminDashboard() {
    const response = await axios.get(`${API_BASE}/admin/dashboard`, { withCredentials: true });
    return response.data;
  }

  async adminLogout() {
    const response = await axios.post(`${API_BASE}/admin/logout`, undefined, { withCredentials: true });
    return response.data;
  }

  // Customer API methods
  async customerLogin(phone: string) {
    const response = await axios.post(`${API_BASE}/customer/login`, { phone }, { withCredentials: true });
    return response.data;
  }

  async customerSendOTP(phone: string) {
    const response = await axios.post(`${API_BASE}/customer/otp/send`, { phone }, { withCredentials: true });
    return response.data;
  }

  async customerVerifyOTP(phone: string, otp: string) {
    const response = await axios.post(`${API_BASE}/customer/otp/verify`, { phone, otp }, { withCredentials: true });
    return response.data;
  }

  async customerDashboard() {
    // Treat 401 as unauthenticated instead of throwing
    const response = await axios.get(`${API_BASE}/customer/dashboard`, {
      withCredentials: true,
      validateStatus: (status) => status < 500,
    });

    if (response.status === 401) {
      return { success: false } as any;
    }

    if (response.status < 200 || response.status >= 300) {
      console.warn('Customer dashboard API non-success status:', response.status);
    }

    return response.data;
  }

  async customerChangePassword(currentPassword: string, newPassword: string) {
    const response = await axios.post(`${API_BASE}/customer/change-password`, { 
      currentPassword, 
      newPassword 
    }, { withCredentials: true });
    return response.data;
  }

  async customerLogout() {
    const response = await axios.post(`${API_BASE}/customer/logout`, undefined, { withCredentials: true });
    return response.data;
  }

  // Health check
  async healthCheck() {
    const response = await axios.get(`${API_BASE}/health`, { withCredentials: true });
    return response.data;
  }

  // WhatsApp status
  async whatsappStatus() {
    const response = await axios.get(`${API_BASE}/whatsapp/status`, { withCredentials: true });
    return response.data;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Re-export types from lib/api.ts for consistency
export type { ApiResponse, AdminUser, CustomerUser } from '@/lib/api';
