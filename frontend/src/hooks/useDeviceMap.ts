import { useState, useEffect } from 'react';

// In-memory cache for device data (longer TTL for stable map performance)
const deviceCache = {
  data: null as DeviceData | null,
  timestamp: 0,
  ttl: 5 * 60 * 1000 // 5 minutes (increased for map stability)
};

export interface DeviceLocation {
  lat: number;
  lng: number;
  address?: string;
}

export interface DeviceStatus {
  isOnline: boolean;
  lastInform: string;
  rxPower?: number;
}

export interface DeviceInfo {
  modelName: string;
  softwareVersion: string;
  serialNumber: string;
}

export interface DeviceData {
  location: DeviceLocation;
  status: DeviceStatus;
  info: DeviceInfo;
  manufacturer: string;
  pppoeUsername: string;
  serialNumber: string;
}

interface UseDeviceMapReturn {
  device: DeviceData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDeviceMap(): UseDeviceMapReturn {
  const [device, setDevice] = useState<DeviceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeviceData = async (forceRefresh = false) => {
    try {
      // console.log(`🗺️ Loading device location data... (force refresh: ${forceRefresh})`);
      // Only show loading on initial load or force refresh
      if (!device || forceRefresh) {
        setLoading(true);
      }
      setError(null);

      // Check cache first (skip if force refresh)
      const now = Date.now();
      if (!forceRefresh && deviceCache.data && (now - deviceCache.timestamp) < deviceCache.ttl) {
        console.log('⚡ Returning cached device data');
        setDevice(deviceCache.data);
        setLoading(false);
        return;
      }

      // Try API call first, fallback to mock if needed
      let useApi = true;
      let response = null;

      // In development, try API first but fallback to mock if auth fails

      if (useApi) {
        try {
          console.time('🕰️ API Call Duration');
          const url = forceRefresh ? '/api/customer/map/data?refresh=true' : '/api/customer/map/data';
          response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          console.timeEnd('🕰️ API Call Duration');

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.device) {
              // Cache the result
              deviceCache.data = data.device;
              deviceCache.timestamp = now;

              setDevice(data.device);
              // console.log('✅ Device data loaded and cached successfully');
              return; // Success, exit here
            } else {
              // API returned success=false or no device data
              throw new Error(data.message || 'Device data not available');
            }
          } else {
            // API returned error status
            const errorData = await response.json().catch(() => ({ message: 'Unknown API error' }));
            throw new Error(`API Error ${response.status}: ${errorData.message || response.statusText}`);
          }

        } catch (error) {
          console.error('❌ API call failed:', error);
          if (import.meta.env.DEV) {
            // console.log('⚠️ API error, falling back to mock data:', error);
            useApi = false;
          } else {
            throw error;
          }
        }
      }
      
      // Mock data fallback (development only)
      if (!useApi && import.meta.env.DEV) {
        // console.log('🔧 Using mock device data for development');
        
        // Reduced mock delay for faster development
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const mockDevice: DeviceData = {
          location: {
            lat: -7.198741,
            lng: 107.946458,
            address: 'Jl. Garut Kota No. 123, Garut, Jawa Barat'
          },
          status: {
            isOnline: true,
            lastInform: new Date().toLocaleString('id-ID'),
            rxPower: -23.5
          },
          info: {
            modelName: 'GPON ONU HG6245D',
            softwareVersion: 'V300R019C10SPC010',
            serialNumber: 'ZTEG12345678'
          },
          manufacturer: 'ZTE',
          pppoeUsername: 'customer123@axelink.net',
          serialNumber: 'ZTEG12345678'
        };
        
        // Cache mock data too
        deviceCache.data = mockDevice;
        deviceCache.timestamp = now;
        
        setDevice(mockDevice);
        // console.log('✅ Mock device data loaded and cached successfully');
        return;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ Error loading device data:', errorMessage);

      // Provide more specific error messages based on error type
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        userFriendlyMessage = 'Network connection error. Please check your internet connection and try again.';
      } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        userFriendlyMessage = 'Session expired. Please log in again.';
      } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        userFriendlyMessage = 'Access denied. Please contact administrator.';
      } else if (errorMessage.includes('404')) {
        userFriendlyMessage = 'Device data not found. Please contact administrator.';
      } else if (errorMessage.includes('500')) {
        userFriendlyMessage = 'Server error. Please try again later.';
      }

      setError(userFriendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  // Load device data once on hook initialization
  useEffect(() => {
    fetchDeviceData();
  }, []); // Empty dependency array - load only once

  return {
    device,
    loading,
    error,
    refetch: fetchDeviceData,
  };
}
