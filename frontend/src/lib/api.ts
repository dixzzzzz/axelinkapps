/**
 * API Utilities and Types
 * Complementary to config/api.ts - provides types and utilities
 * 
 * NOTE: For actual API calls, use the apiClient from config/api.ts
 * This file provides shared types and utilities only.
 */

import { apiClient } from '@/config/api';

// Re-export the main API client for convenience
export { apiClient };

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  csrfToken?: string; // CSRF token from backend
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Helper function to handle API errors consistently
 */
export function handleApiError(error: any): string {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

/**
 * Helper function to check if an error is a network error
 */
export function isNetworkError(error: any): boolean {
  return !error.response || error.code === 'NETWORK_ERROR';
}

/**
 * Helper function to check if an error is an authentication error
 */
export function isAuthError(error: any): boolean {
  return error.response?.status === 401 || error.response?.status === 403;
}

/**
 * Common API response types
 */
export interface AdminUser {
  username: string;
  role: string;
  loginTime?: string;
  sessionId?: string;
}

export interface CustomerUser {
  phone: string;
  email?: string;
  name: string;
  isFirstLogin?: boolean;
  deviceData?: any;
  status?: 'active' | 'inactive' | 'suspended';
  connectionStatus?: 'online' | 'offline';
}

export interface DeviceData {
  id: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  status: 'online' | 'offline';
  lastInform: string;
  pppoeUsername: string;
  ssid?: string;
  password?: string;
  rxPower?: number;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
}

/**
 * API Status Constants
 */
export const API_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
  LOADING: 'loading',
  IDLE: 'idle',
} as const;

export type ApiStatus = typeof API_STATUS[keyof typeof API_STATUS];

/**
 * React Query helpers
 */
export const queryKeys = {
  health: ['health'] as const,
  
  // Admin query keys
  admin: {
    dashboard: ['admin', 'dashboard'] as const,
    verify: ['admin', 'verify'] as const,
    settings: ['admin', 'settings'] as const,
    genieacs: {
      devices: ['admin', 'genieacs', 'devices'] as const,
      locations: ['admin', 'genieacs', 'locations'] as const,
    },
    mikrotik: {
      connections: ['admin', 'mikrotik', 'connections'] as const,
      interfaces: ['admin', 'mikrotik', 'interfaces'] as const,
    },
    infrastructure: {
      odp: ['admin', 'infrastructure', 'odp'] as const,
      odc: ['admin', 'infrastructure', 'odc'] as const,
    },
  },
  
  // Customer query keys
  customer: {
    dashboard: ['customer', 'dashboard'] as const,
    mapData: ['customer', 'map'] as const,
  },
  
  // System query keys
  whatsappStatus: ['whatsapp', 'status'] as const,
  mapSettings: ['map', 'settings'] as const,
};

/**
 * Development and environment helpers
 */
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;
export const apiBaseUrl = '/api'; // Always use /api prefix

/**
 * Utility function to create consistent error messages
 */
export function createErrorMessage(error: any, fallback = 'Something went wrong'): string {
  return handleApiError(error) || fallback;
}

/**
 * Default export re-exports the main API client
 */
export default apiClient;
