import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || (import.meta as any).env?.VITE_API_URL || '/api';

interface DeviceData {
  status?: string;
  Manufacturer?: string;
  temperature?: string;
  rxPower?: string;
  pppoeIP?: string;
  pppoeUsername?: string;
  ssid?: string;
  ssid2g?: string;
  ssid5g?: string;
  totalAssociations?: number;
  lastInform?: string;
  connectedUsers?: ConnectedUser[];
  serialNumber?: string;
  model?: string;
  softwareVersion?: string;
  lokasi?: string;
}

interface ConnectedUser {
  hostname: string;
  ip: string;
  mac: string;
  iface: string;
  leaseTime?: string;
  waktu: string;
}

interface DashboardData {
  phone: string;
  email?: string;
  name: string;
  deviceData?: DeviceData;
  status?: 'active' | 'inactive' | 'suspended';
  connectionStatus?: 'online' | 'offline';
}

interface UseCustomerDashboardReturn {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  restartDevice: () => Promise<{ success: boolean; message: string }>;
  changeSSID: (type: '2g' | '5g', ssid: string) => Promise<{ success: boolean; message: string }>;
  changePassword: (type: '2g' | '5g', password: string) => Promise<{ success: boolean; message: string }>;
}

export const useCustomerDashboard = (): UseCustomerDashboardReturn => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_BASE}/customer/dashboard`, {
        withCredentials: true,
      });

      const result = response.data;

      if (result.success) {
        const dashboardData: DashboardData = {
          phone: result.data.phone || 'N/A',
          email: `${result.data.phone}@customer.local`,
          name: `Customer ${result.data.phone}`,
          deviceData: {
            status: result.data.status,
            Manufacturer: result.data.Manufacturer,
            temperature: result.data.temperature,
            rxPower: result.data.rxPower,
            pppoeIP: result.data.pppoeIP,
            pppoeUsername: result.data.pppoeUsername,
            ssid: result.data.ssid,
            ssid2g: result.data.ssid2g,
            ssid5g: result.data.ssid5g,
            totalAssociations: result.data.totalAssociations,
            lastInform: result.data.lastInform,
            connectedUsers: result.data.connectedUsers || [],
            serialNumber: result.data.serialNumber,
            model: result.data.model,
            softwareVersion: result.data.softwareVersion,
            lokasi: result.data.lokasi,
          },
          status: result.data.status === 'Online' ? 'active' : 'inactive',
          connectionStatus: result.data.status === 'Online' ? 'online' : 'offline',
        };

        setData(dashboardData);
      } else {
        throw new Error(result.message || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
      console.error('❌ Dashboard data fetch error:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshData = useCallback(async () => {
    await fetchDashboardData();
  }, [fetchDashboardData]);

  const restartDevice = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await axios.post(`${API_BASE}/customer/restart-device`, undefined, {
        withCredentials: true,
      });

      const result = response.data;
      
      if (result.success) {
        setTimeout(() => {
          refreshData();
        }, 5000);

        return { success: true, message: result.message || 'Device restart initiated successfully' };
      } else {
        throw new Error(result.message || 'Failed to restart device');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restart device';
      console.error('❌ Device restart error:', errorMessage);
      return { success: false, message: errorMessage };
    }
  }, [refreshData]);

  const changeSSID = useCallback(async (type: '2g' | '5g', ssid: string): Promise<{ success: boolean; message: string }> => {
    try {
      if (!ssid.trim()) {
        return { success: false, message: 'SSID cannot be empty' };
      }

      const response = await axios.post(`${API_BASE}/customer/change-ssid-${type}`, { [`ssid${type}`]: ssid }, {
        withCredentials: true,
      });

      const result = response.data;
      
      if (result.success) {
        setTimeout(() => {
          refreshData();
        }, 3000);

        return { success: true, message: result.message || `SSID ${type.toUpperCase()} changed successfully` };
      } else {
        throw new Error(result.message || `Failed to change SSID ${type}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to change SSID ${type.toUpperCase()}`;
      console.error(`❌ SSID ${type} change error:`, errorMessage);
      return { success: false, message: errorMessage };
    }
  }, [refreshData]);

  const changePassword = useCallback(async (type: '2g' | '5g', password: string): Promise<{ success: boolean; message: string }> => {
    try {
      if (!password.trim()) {
        return { success: false, message: 'Password cannot be empty' };
      }

      if (password.length < 8) {
        return { success: false, message: 'Password must be at least 8 characters long' };
      }

      const response = await axios.post(`${API_BASE}/customer/change-password-${type}`, { [`password${type}`]: password }, {
        withCredentials: true,
      });

      const result = response.data;
      
      if (result.success) {
        setTimeout(() => {
          refreshData();
        }, 3000);

        return { success: true, message: result.message || `Password ${type.toUpperCase()} changed successfully` };
      } else {
        throw new Error(result.message || `Failed to change password ${type}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to change password ${type.toUpperCase()}`;
      console.error(`❌ Password ${type} change error:`, errorMessage);
      return { success: false, message: errorMessage };
    }
  }, [refreshData]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    data,
    loading,
    error,
    refreshData,
    restartDevice,
    changeSSID,
    changePassword,
  };
};
