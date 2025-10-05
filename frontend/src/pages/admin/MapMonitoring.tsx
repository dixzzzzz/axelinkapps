import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Import marker icons
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  MapPin, 
  Wifi, 
  WifiOff, 
  Search, 
  RefreshCw, 
  Filter,
  Router,
  Users,
  Activity,
  Phone,
  Eye,
  Navigation,
  Plus,
  Building,
  Zap,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Types
interface DeviceLocation {
  deviceId: string;
  serial: string;
  tag: string;
  lat: number;
  lng: number;
  address: string;
  lastUpdated: string;
  updatedBy: string;
}

interface Device {
  id: string;
  serialNumber: string;
  manufacturer: string;
  modelName: string;
  pppoeUsername: string;
  customerPhone: string;
  status: {
    isOnline: boolean;
    lastInform: string;
    timeDiffMinutes?: number;
    rxPower?: number;
  };
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  hasLocation: boolean;
  wifi?: {
    ssid: string;
    password: string;
  };
  // Additional fields for detailed popup
  info?: {
    softwareVersion: string;
  };
  ssid5g?: string;
}

interface MapStats {
  total: number;
  online: number;
  offline: number;
  withLocation: number;
}

interface ODPLocation {
  id: string;
  name: string;
  type: 'ODP';
  location: {
    lat: number;
    lng: number;
  };
  address: string;
  capacity: number;
  used: number;
  activePorts?: number;
  inactivePorts?: number;
  status: 'active' | 'full' | 'maintenance';
  installation_date: string;
  notes: string;
  selected_customers?: string[];
  selected_customer_info?: {
    id: string;
    pppoeUsername: string;
    manufacturer: string;
    modelName: string;
  }[];
}

interface ODCLocation {
  id: string;
  name: string;
  type: 'ODC';
  location: {
    lat: number;
    lng: number;
  };
  address: string;
  capacity: number;
  used: number;
  activePorts?: number;
  inactivePorts?: number;
  status: 'active' | 'expansion' | 'maintenance';
  installation_date: string;
  notes: string;
  served_odps: string[];
}

interface InfraStats {
  odp: {
    total: number;
    active: number;
    full: number;
    maintenance: number;
  };
  odc: {
    total: number;
    active: number;
    expansion: number;
    maintenance: number;
  };
}

export default function MapMonitoring() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  
  // Note: Authentication check removed - direct access to admin portal

  
  // State
  const [mapMode, setMapMode] = useState<'street' | 'satellite'>('satellite');
  const [devices, setDevices] = useState<Device[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState<MapStats>({ total: 0, online: 0, offline: 0, withLocation: 0 });
  const [odpLocations, setOdpLocations] = useState<ODPLocation[]>([]);
  const [odcLocations, setOdcLocations] = useState<ODCLocation[]>([]);
  const [infraStats, setInfraStats] = useState<InfraStats>({
    odp: { total: 0, active: 0, full: 0, maintenance: 0 },
    odc: { total: 0, active: 0, expansion: 0, maintenance: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'online' | 'offline' | 'with-location'>('all');
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Location Editor Modal states
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [selectedDeviceForLocation, setSelectedDeviceForLocation] = useState<Device | null>(null);
  const [tempLocation, setTempLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationAddress, setLocationAddress] = useState('');
  const [coordinateInput, setCoordinateInput] = useState('');
  const [isLocationSaving, setIsLocationSaving] = useState(false);


  // Update infrastructure field
  const updateInfrastructureField = async (id: string, type: 'ODP' | 'ODC', field: string, value: any) => {
    // console.log(`🔄 Updating ${type} ${id}: ${field} = ${value}`);
    
    try {
      const endpoint = type === 'ODP' ? `/api/admin/infrastructure/odp/${id}` : `/api/admin/infrastructure/odc/${id}`;
      
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          [field]: value
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        
        // Handle authentication error
        if (response.status === 401) {
          toast({
            title: "Authentication Required",
            description: "Please login as admin to perform this action",
            variant: "destructive",
          });
          setTimeout(() => {
            navigate('/admin/login');
          }, 2000);
          return;
        }
        
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: `${type} Updated`,
          description: `${field} updated successfully`,
        });
        
        // Refresh map data to update UI
        await loadMapData(false);
      } else {
        throw new Error(data.message || `Failed to update ${type} ${field}`);
      }
    } catch (error) {
      console.error(`❌ Error updating ${type} ${field}:`, error);
      toast({
        title: "Update Failed",
        description: `Failed to update ${field}: ${error.message}`,
        variant: "destructive",
      });
      throw error;
    }
  };


  // Initialize Leaflet (via local import) and set global helpers
  useEffect(() => {
    // console.log('🗺️ ADMIN MapMonitoring component mounted and initializing');
    // console.log('🧩 useEffect init: setting up styles and initializing map');

    // Add custom CSS for router markers and infrastructure markers
    const customStyle = document.createElement('style');
    customStyle.textContent = `
      /* Ensure Leaflet map never overlays global overlays (like mobile sidebar) */
      .leaflet-container { z-index: 0 !important; }
      .leaflet-top, .leaflet-bottom, .leaflet-control { z-index: 9999 !important; }

      .custom-router-marker {
        background: transparent !important;
        border: none !important;
      }
      
      .custom-router-marker svg {
        transition: all 0.2s ease;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
      }
      
      .custom-router-marker:hover svg {
        transform: scale(1.1);
        filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));
      }
      
      .custom-odp-marker, .custom-odc-marker {
        background: transparent !important;
        border: none !important;
      }
      
      .custom-odp-marker svg, .custom-odc-marker svg {
        transition: all 0.2s ease;
        cursor: pointer;
      }
      
      .custom-odp-marker:hover svg, .custom-odc-marker:hover svg {
        transform: scale(1.1);
      }
      
      .custom-odp-marker:hover path, .custom-odc-marker:hover path {
        filter: brightness(1.1);
      }
    `;
    document.head.appendChild(customStyle);

    // Set global infrastructure update function
    (window as any).updateInfraField = async (id: string, type: 'ODP' | 'ODC', field: string, value: any) => {
      // console.log(`🔄 Updating ${type} ${id}: ${field} = ${value}`);
      try {
        await updateInfrastructureField(id, type, field, value);
      } catch (error) {
        console.error(`❌ Error updating ${type} field:`, error);
        toast({
          title: "Update Failed",
          description: `Failed to update ${field}: ${error.message}`,
          variant: "destructive",
        });
      }
    };

    // Quick action functions
    (window as any).markAsFull = (id: string, type: 'ODP' | 'ODC') => {
      (window as any).updateInfraField(id, type, 'status', 'full');
    };

    (window as any).addPorts = (id: string, type: 'ODP' | 'ODC', increment: number) => {
      const infrastructure = type === 'ODP' ? odpLocations.find(o => o.id === id) : odcLocations.find(o => o.id === id);
      if (infrastructure) {
        const newCapacity = infrastructure.capacity + increment;
        (window as any).updateInfraField(id, type, 'capacity', newCapacity);
      }
    };

    (window as any).resetUsage = (id: string, type: 'ODP' | 'ODC') => {
      (window as any).updateInfraField(id, type, 'used', 0);
    };

    // Initialize map now that Leaflet is available via imports
    // Delay slightly to ensure ref attached after render commit
    setTimeout(() => {
      initializeMap();
    }, 50);

    // Cleanup
    return () => {
      try { document.head.removeChild(customStyle); } catch {}
      delete (window as any).updateInfraField;
      delete (window as any).markAsFull;
      delete (window as any).addPorts;
      delete (window as any).resetUsage;
    };
  }, []);

  // Location Editor Map Effect for Devices
  useEffect(() => {
    let locationEditorMap: any = null;
    let locationMarker: any = null;

    if (isLocationModalOpen && selectedDeviceForLocation && window.L) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        const mapContainer = document.getElementById('location-editor-map');
        if (!mapContainer) return;

        // Remove any existing map
        if (locationEditorMap) {
          locationEditorMap.remove();
        }

        // Initialize the location editor map
        const initialLocation = tempLocation || 
                               (selectedDeviceForLocation.hasLocation ? selectedDeviceForLocation.location : null) || 
                               { lat: -7.199102, lng: 107.94646 };
        
        locationEditorMap = window.L.map('location-editor-map').setView(
          [initialLocation.lat, initialLocation.lng], 
          15
        );

        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(locationEditorMap);

        // Add current location marker if exists
        if (tempLocation) {
          locationMarker = window.L.marker([tempLocation.lat, tempLocation.lng])
            .addTo(locationEditorMap)
            .bindPopup('Selected Location')
            .openPopup();
        } else if (selectedDeviceForLocation.hasLocation && selectedDeviceForLocation.location) {
          locationMarker = window.L.marker([
            selectedDeviceForLocation.location.lat, 
            selectedDeviceForLocation.location.lng
          ])
            .addTo(locationEditorMap)
            .bindPopup('Current Location')
            .openPopup();
        }

        // Handle map clicks to set new location
        locationEditorMap.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          
          // Remove existing marker
          if (locationMarker) {
            locationEditorMap.removeLayer(locationMarker);
          }

          // Add new marker
          locationMarker = window.L.marker([lat, lng])
            .addTo(locationEditorMap)
            .bindPopup('Selected Location')
            .openPopup();

          // Update temp location state and coordinate input
          setTempLocation({ lat, lng });
          setCoordinateInput(formatCoordinateDisplay(lat, lng));
        });
      }, 100);

      return () => {
        clearTimeout(timer);
        if (locationEditorMap) {
          locationEditorMap.remove();
          locationEditorMap = null;
        }
      };
    }

    return () => {
      if (locationEditorMap) {
        locationEditorMap.remove();
        locationEditorMap = null;
      }
    };
  }, [isLocationModalOpen, selectedDeviceForLocation, tempLocation, coordinateInput]);


  // Initialize map
  const initializeMap = () => {
    // console.log('🧭­ initializeMap called');
    if (!mapRef.current) {
      console.warn('⚠️ mapRef.current is null, cannot initialize map');
      return;
    }
    if (mapInstanceRef.current) {
      // console.log('ℹ️ Map already initialized, skipping re-init');
      return;
    }

    // Create map instance
    const map = L.map(mapRef.current, {
      center: [-7.198, 107.946], // Garut area based on your data
      zoom: 13,
      zoomControl: true,
      scrollWheelZoom: true
    });

    // Add tile layer
    // console.log('🧱 Adding tile layer');
  // definisi 2 mode layer
  const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    });

  const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{
    attribution: 'Tiles © Esri',
    maxZoom: 19,
    }
  );

  // default pakai satellite
  satelliteLayer.addTo(map);

  // tambahkan kontrol untuk switch
  L.control.layers(
      {
        "Street": streetLayer,
        "Satellite": satelliteLayer,
      },
    ).addTo(map);

    // Add scale control
    L.control.scale().addTo(map);

    mapInstanceRef.current = map;
    // console.log('✅ Map instance set, loading data...');
    
    // Load initial data with small delay to ensure map is fully ready
    setTimeout(() => {
      loadMapData();
    }, 50);
  };

  // Load ODP/ODC data
  const loadInfrastructureData = async () => {
    try {
      // console.log('📍 Loading infrastructure data...');
      
      // Load ODP locations
      const odpResponse = await fetch('/api/admin/infrastructure/odp', {
        credentials: 'include' // Add for session auth
      });
      const odpData = await odpResponse.json();
      // console.log('📊 ODP Response:', odpData);
      
      // Load ODC locations
      const odcResponse = await fetch('/api/admin/infrastructure/odc', {
        credentials: 'include' // Add for session auth
      });
      const odcData = await odcResponse.json();
      // console.log('📊 ODC Response:', odcData);
      
      if (odpData.success && odcData.success) {
        // console.log(`📍 Setting ODP locations: ${odpData.locations.length} items`);
        // console.log(`📍 Setting ODC locations: ${odcData.locations.length} items`);
        
        setOdpLocations(odpData.locations);
        setOdcLocations(odcData.locations);
        
        // Calculate infrastructure stats
        const newInfraStats = calculateInfraStats(odpData.locations, odcData.locations);
        setInfraStats(newInfraStats);
        // console.log('📈 Infrastructure stats updated:', newInfraStats);
      } else {
        console.error('❌ Failed to load infrastructure data:', {
          odpSuccess: odpData.success,
          odcSuccess: odcData.success,
          odpError: odpData.message,
          odcError: odcData.message
        });
      }
    } catch (error) {
      console.error('❌ Error loading infrastructure data:', error);
    }
  };

  // Calculate infrastructure statistics
  const calculateInfraStats = (odp: ODPLocation[], odc: ODCLocation[]): InfraStats => {
    return {
      odp: {
        total: odp.length,
        active: odp.filter(o => o.status === 'active').length,
        full: odp.filter(o => o.status === 'full').length,
        maintenance: odp.filter(o => o.status === 'maintenance').length,
      },
      odc: {
        total: odc.length,
        active: odc.filter(o => o.status === 'active').length,
        expansion: odc.filter(o => o.status === 'expansion').length,
        maintenance: odc.filter(o => o.status === 'maintenance').length,
      },
    };
  };

  // Load map data
  const loadMapData = async (isAutoRefresh = false) => {
    try {
      // console.log('🔄 loadMapData called, isAutoRefresh=', isAutoRefresh);
      if (!isAutoRefresh) {
        setLoading(true);
      }
      
      // Load devices from GenieACS
      // console.log('📡 Fetching /api/admin/genieacs/devices ...');
      const devicesResponse = await fetch('/api/admin/genieacs/devices', { credentials: 'include' });
      const devicesData = await devicesResponse.json();
      // console.log('📡 Devices response success=', devicesData.success, 'count=', devicesData.devices?.length);
      
      // Load locations
      // console.log('📍 Fetching /api/admin/genieacs/locations ...');
      const locationsResponse = await fetch('/api/admin/genieacs/locations', { credentials: 'include' });
      const locationsData = await locationsResponse.json();
      // console.log('📍 Locations response success=', locationsData.success, 'count=', locationsData.locations ? Object.keys(locationsData.locations).length : 0);
      
      // Load infrastructure data
      await loadInfrastructureData();
      
      if (devicesData.success && locationsData.success) {
        const devicesWithLocation = processDevicesData(devicesData.devices, locationsData.locations);
        setDevices(devicesWithLocation);
        setFilteredDevices(devicesWithLocation);
        
        // Update stats
        const newStats = calculateStats(devicesWithLocation);
        setStats(newStats);
        
        // Display on map
        // console.log('🗺️ Calling displayDevicesOnMap with', devicesWithLocation.length, 'devices');
        displayDevicesOnMap(devicesWithLocation);
        
        // Update last refresh timestamp and reset error state
        setLastRefresh(new Date());
        setConnectionError(false);
        setRetryCount(0);
        
        if (!isAutoRefresh) {
          toast({
            title: "Data berhasil dimuat",
            description: `${devicesWithLocation.length} perangkat ditemukan`,
          });
        }
      } else {
        console.error('❌ devicesData or locationsData not successful', { devicesSuccess: devicesData.success, locationsSuccess: locationsData.success });
        throw new Error('Failed to load devices or locations data');
      }
    } catch (error) {
      console.error('Error loading map data:', error);
      setConnectionError(true);
      setRetryCount(prev => prev + 1);
      
      if (!isAutoRefresh) {
        toast({
          title: "Error",
          description: "Gagal memuat data peta. Akan dicoba lagi otomatis.",
          variant: "destructive",
        });
      }
      
      // Auto-retry for connection errors (up to 3 times)
      if (retryCount < 3 && isAutoRefresh) {
        setTimeout(() => {
          // console.log(`🔄 Auto-retry attempt ${retryCount + 1}/3`);
          loadMapData(true);
        }, 10000); // Retry after 10 seconds
      }
    } finally {
      if (!isAutoRefresh) {
        // console.log('🧹 loadMapData finally: setLoading(false)');
        setLoading(false);
      }
    }
  };

  // Process devices data with locations
  const processDevicesData = (devicesRaw: any[], locations: any): Device[] => {
    return devicesRaw.map(device => {
      const deviceId = device.id || device._id || device.DeviceID?.SerialNumber || '';
      const locationData = locations[deviceId];
      
      // Use status from API response if available, otherwise calculate
      let isOnline = false;
      let timeDiffMinutes = 0;
      
      if (device.status === 'online') {
        isOnline = true;
      } else if (device.status === 'offline') {
        isOnline = false;
      } else {
        // Fallback calculation if status not provided
        const now = Date.now();
        const lastInform = device._lastInform ? new Date(device._lastInform).getTime() : 0;
        timeDiffMinutes = (now - lastInform) / (1000 * 60);
        isOnline = timeDiffMinutes < 30;
      }
      
      // Extract debug info if available
      if (device.debugInfo?.minutesDiff) {
        timeDiffMinutes = parseFloat(device.debugInfo.minutesDiff);
      }
      
      return {
        id: deviceId,
        serialNumber: device.serialNumber || device.DeviceID?.SerialNumber || deviceId,
        manufacturer: device.info?.manufacturer || 
                     device.DeviceID?.Manufacturer || 
                     device.InternetGatewayDevice?.DeviceInfo?.Manufacturer?._value ||
                     'Unknown',
        modelName: device.model || device.DeviceID?.ProductClass || 'Unknown',
        pppoeUsername: device.pppoeUsername || device.VirtualParameters?.pppUsername || '-',
        customerPhone: extractPhoneFromTag(device.tag || device.Tags || device._tags || []),
        status: {
          isOnline,
          lastInform: device.lastInform || (device._lastInform ? new Date(device._lastInform).toLocaleString('id-ID') : '-'),
          timeDiffMinutes: Math.round(timeDiffMinutes),
          rxPower: device.rxPower ? parseFloat(device.rxPower) : (device.VirtualParameters?.rxpower ? parseFloat(device.VirtualParameters.rxpower) : undefined)
        },
        location: locationData ? {
          lat: locationData.lat,
          lng: locationData.lng,
          address: locationData.address
        } : undefined,
        hasLocation: !!locationData,
        wifi: {
          ssid: device.ssid2g || device.InternetGatewayDevice?.LANDevice?.['1']?.WLANConfiguration?.['1']?.SSID?._value || '-',
          password: device.password2g || device.InternetGatewayDevice?.LANDevice?.['1']?.WLANConfiguration?.['1']?.KeyPassphrase?._value || '-'
        },
        // Additional data for popup display
        info: {
          softwareVersion: device.info?.softwareVersion || device.InternetGatewayDevice?.DeviceInfo?.SoftwareVersion?._value || 'N/A'
        },
        ssid5g: device.ssid5g || 'N/A'
      } as Device & { info: { softwareVersion: string }, ssid5g: string };
    });
  };

  // Extract phone number from tags
  const extractPhoneFromTag = (tags: any): string => {
    // If it's already a processed tag string from API, try to extract phone
    if (typeof tags === 'string' && tags !== '-') {
      const match = tags.match(/\d{10,}/);
      if (match) return match[0];
    }
    
    // Handle array format
    if (Array.isArray(tags)) {
      const phoneTag = tags.find((tag: string) => /\d{10,}/.test(tag));
      if (phoneTag) {
        const match = phoneTag.match(/\d{10,}/);
        return match ? match[0] : '-';
      }
    }
    
    return '-';
  };

  // Calculate statistics
  const calculateStats = (devices: Device[]): MapStats => {
    return {
      total: devices.length,
      online: devices.filter(d => d.status.isOnline).length,
      offline: devices.filter(d => !d.status.isOnline).length,
      withLocation: devices.filter(d => d.hasLocation).length
    };
  };

  // Display devices on map
  const displayDevicesOnMap = (devices: Device[]) => {
    // console.log('🗺️ displayDevicesOnMap called with', devices.length, 'devices');
    if (!mapInstanceRef.current) {
      console.warn('⚠️ mapInstanceRef.current is null, retrying in 100ms...');
      // Retry after a short delay if map is not ready yet
      setTimeout(() => {
        if (mapInstanceRef.current) {
          // console.log('🔄 Retrying displayDevicesOnMap after delay');
          displayDevicesOnMap(devices);
        } else {
          console.error('❌ Map still not ready after retry, skipping device display');
        }
      }, 100);
      return;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    // console.log('🧹 Clearing', markersRef.current.length, 'existing markers');
    markersRef.current.forEach(marker => map.removeLayer(marker));
    markersRef.current = [];

    // Add ODP markers
    // console.log('🟣 Adding', odpLocations.length, 'ODP markers');
    odpLocations.forEach(odp => {
      const marker = createInfrastructureMarker(L, odp, 'ODP', odpLocations);
      marker.addTo(map);
      markersRef.current.push(marker);
    });

    // Add ODC markers
    // console.log('🟦 Adding', odcLocations.length, 'ODC markers');
    odcLocations.forEach(odc => {
      const marker = createInfrastructureMarker(L, odc, 'ODC', odpLocations);
      marker.addTo(map);
      markersRef.current.push(marker);
    });

    // Group devices by location
    const devicesByLocation: { [key: string]: Device[] } = {};
    const devicesWithoutLocation: Device[] = [];

    devices.forEach(device => {
      if (device.hasLocation && device.location) {
        const key = `${device.location.lat},${device.location.lng}`;
        if (!devicesByLocation[key]) {
          devicesByLocation[key] = [];
        }
        devicesByLocation[key].push(device);
      } else {
        devicesWithoutLocation.push(device);
      }
    });

    // Add markers for devices with location
    Object.entries(devicesByLocation).forEach(([locationKey, devicesAtLocation]) => {
      const firstDevice = devicesAtLocation[0];
      if (!firstDevice.location) return;

      const hasOnlineDevice = devicesAtLocation.some(d => d.status.isOnline);
      const markerColor = hasOnlineDevice ? '#10b981' : '#ef4444';
      const deviceCount = devicesAtLocation.length;

      // Create unique ID for this marker's filter
      const filterId = `shadow-${firstDevice.id.replace(/[^a-zA-Z0-9]/g, '')}`;
      
      // Create router icon SVG with circular background
      const routerIconSVG = `
        <svg width="${deviceCount > 1 ? '32' : '28'}" height="${deviceCount > 1 ? '32' : '28'}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="${filterId}" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.4)"/>
            </filter>
          </defs>
          <!-- Circular background -->
          <circle cx="16" cy="16" r="12" fill="${markerColor}" stroke="white" stroke-width="2" filter="url(#${filterId})"/>
          
          <!-- Router icon inside (white) -->
          <!-- Router body -->
          <rect x="9" y="14" width="14" height="6" rx="1" ry="1" fill="white"/>
          <!-- Antennas -->
          <path d="M11 14 L11 10" stroke="white" stroke-width="1.5" stroke-linecap="round" fill="none"/>
          <path d="M16 14 L16 9" stroke="white" stroke-width="1.5" stroke-linecap="round" fill="none"/>
          <path d="M21 14 L21 10" stroke="white" stroke-width="1.5" stroke-linecap="round" fill="none"/>
          <!-- Status LED -->
          <circle cx="11.5" cy="16.5" r="0.8" fill="${markerColor}"/>
          <!-- Ethernet ports -->
          <rect x="14" y="16" width="1.5" height="1" fill="${markerColor}" rx="0.2"/>
          <rect x="16" y="16" width="1.5" height="1" fill="${markerColor}" rx="0.2"/>
          <rect x="18" y="16" width="1.5" height="1" fill="${markerColor}" rx="0.2"/>
          <rect x="20" y="16" width="1.5" height="1" fill="${markerColor}" rx="0.2"/>
          
          <!-- Signal waves for online devices -->
          ${hasOnlineDevice ? `
            <path d="M24 15 Q25.5 16 24 17" stroke="white" stroke-width="1" fill="none" opacity="0.9"/>
            <path d="M25 14.5 Q26.5 16 25 17.5" stroke="white" stroke-width="0.8" fill="none" opacity="0.7"/>
          ` : ''}
        </svg>
      `;
      
      // Create custom marker icon
      const markerIcon = L.divIcon({
        className: 'custom-router-marker',
        html: `
          <div style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: ${deviceCount > 1 ? '36px' : '32px'};
            height: ${deviceCount > 1 ? '36px' : '32px'};
          ">
            ${routerIconSVG}
            ${deviceCount > 1 ? `
              <div style="
                position: absolute;
                top: -4px;
                right: -4px;
                background-color: #1f2937;
                color: white;
                border-radius: 50%;
                width: 18px;
                height: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                font-weight: bold;
                border: 2px solid white;
                box-shadow: 0 1px 3px rgba(0,0,0,0.3);
              ">${deviceCount}</div>
            ` : ''}
          </div>
        `,
        iconSize: deviceCount > 1 ? [36, 36] : [32, 32],
        iconAnchor: deviceCount > 1 ? [18, 18] : [16, 16]
      });

      const marker = L.marker([firstDevice.location.lat, firstDevice.location.lng], {
        icon: markerIcon
      });

      // Create popup content
      const popupContent = createPopupContent(devicesAtLocation);
      marker.bindPopup(popupContent, {
        maxWidth: 400,
        className: 'custom-popup'
      });

      // Add click event
      marker.on('click', () => {
        setSelectedDevice(firstDevice.id);
      });

      marker.addTo(map);
      markersRef.current.push(marker);
      });

      // Fit map to show all markers
      if (markersRef.current.length > 0) {
        const group = new L.featureGroup(markersRef.current);
        map.fitBounds(group.getBounds().pad(0.1));
      }
    };

  // Create infrastructure markers
  const createInfrastructureMarker = (L: any, infra: ODPLocation | ODCLocation, type: 'ODP' | 'ODC', odpLocations: ODPLocation[] = []) => {
    const isODP = type === 'ODP';
    
    // Base colors for ODP vs ODC
    let baseColor = isODP ? '#7c3aed' : '#4338ca'; // Purple for ODP, Indigo for ODC
    
    // Adjust color based on status
    if (infra.status === 'maintenance') {
      baseColor = '#f59e0b'; // Orange for maintenance
    } else if (infra.status === 'full') {
      baseColor = '#ef4444'; // Red for full
    } else if (infra.status === 'expansion') {
      baseColor = '#10b981'; // Green for expansion
    }
    
    const color = baseColor;
    
    // Create map pointer icon
    const infraIcon = L.divIcon({
      className: `custom-${type.toLowerCase()}-marker`,
      html: `
        <div style="
          position: relative;
          width: 30px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <!-- Map Pointer SVG -->
          <svg width="28" height="32" viewBox="0 0 30 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="drop-shadow-${infra.id}" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
              </filter>
            </defs>
            <!-- Pointer shape -->
            <path d="M15 2C9.48 2 5 6.48 5 12C5 20 15 35 15 35S25 20 25 12C25 6.48 20.52 2 15 2Z" 
                  fill="${color}" 
                  stroke="${isODP ? '#7c3aed' : '#4338ca'}" 
                  stroke-width="2" 
                  filter="url(#drop-shadow-${infra.id})"/>
            <!-- Inner circle only (no text) -->
            <circle cx="15" cy="12" r="6" fill="white" opacity="0.9"/>
          </svg>
        </div>
      `,
      iconSize: [28, 32],
      iconAnchor: [14, 30]
    });

    const marker = L.marker([infra.location.lat, infra.location.lng], {
      icon: infraIcon
    });

    // Create popup content for infrastructure
    const popupContent = `
      <div style="
        padding: 12px; 
        font-family: 'Segoe UI', sans-serif; 
        min-width: 200px;
      ">
        <div style="
          font-weight: 700; 
          color: white;
          font-size: 14px;
          margin-bottom: 10px; 
          text-align: center;
          background: ${color};
          padding: 8px;
          border-radius: 6px;
          margin: -12px -12px 10px -12px;
        ">
          ${type} - ${infra.name}
        </div>
        
        ${type === 'ODP' && (infra as ODPLocation).selected_customer_info && (infra as ODPLocation).selected_customer_info.length > 0 ? `
          <div style="margin-bottom: 8px;">
            <div style="font-size: 11px; font-weight: 600; color: #374151; margin-bottom: 4px;">
              📋 Connected Customers (${(infra as ODPLocation).selected_customer_info.length}):
            </div>
            <div style="
              background: #f9fafb;
              border-radius: 4px;
              padding: 6px;
              max-height: 120px;
              overflow-y: auto;
              font-size: 10px;
              line-height: 1.3;
            ">
              ${(infra as ODPLocation).selected_customer_info.map((customer, idx) => `
                <div style="
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  padding: 2px 0;
                  ${idx < (infra as ODPLocation).selected_customer_info.length - 1 ? 'border-bottom: 1px solid #e5e7eb;' : ''}
                ">
                  <div style="font-weight: 500; color: #1f2937;">
                    ${customer.pppoeUsername}
                  </div>
                  <div style="color: #6b7280; font-size: 9px;">
                    ${customer.manufacturer} ${customer.modelName}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        ${type === 'ODC' && (infra as ODCLocation).served_odps && (infra as ODCLocation).served_odps.length > 0 ? `
          <div style="margin-bottom: 8px;">
            <div style="font-size: 11px; font-weight: 600; color: #374151; margin-bottom: 4px;">
              🏢 Connected ODPs (${(infra as ODCLocation).served_odps.length}):
            </div>
            <div style="
              background: #f0f9ff;
              border-radius: 4px;
              padding: 6px;
              max-height: 100px;
              overflow-y: auto;
              font-size: 10px;
              line-height: 1.4;
            ">
              ${(infra as ODCLocation).served_odps.map((odpId, idx) => {
                // Find ODP details from odpLocations array if available
                const odpDetails = odpLocations.find(odp => odp.id === odpId);
                const odpName = odpDetails ? odpDetails.name : odpId.replace(/^odp-/, '').replace(/-\d+$/, '').toUpperCase();
                const odpStatus = odpDetails ? odpDetails.status : 'unknown';
                const odpUsage = odpDetails ? `${odpDetails.used}/${odpDetails.capacity}` : 'N/A';
                
                return `
                  <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 3px 0;
                    ${idx < (infra as ODCLocation).served_odps.length - 1 ? 'border-bottom: 1px solid #dbeafe;' : ''}
                  ">
                    <div style="display: flex; align-items: center; gap: 4px;">
                      <div style="
                        width: 6px;
                        height: 6px;
                        border-radius: 50%;
                        background: ${odpStatus === 'active' ? '#10b981' : odpStatus === 'full' ? '#ef4444' : '#f59e0b'};
                      "></div>
                      <div style="font-weight: 500; color: #1f2937;">
                        ${odpName}
                      </div>
                    </div>
                    <div style="color: #6b7280; font-size: 9px;">
                      ${odpUsage} ports
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}
        
        <div style="margin-bottom: 8px; font-size: 12px;">
          <strong>Capacity:</strong> ${infra.used}/${infra.capacity} ports
          <div style="
            background: #f3f4f6; 
            height: 6px; 
            border-radius: 3px; 
            margin-top: 2px;
            overflow: hidden;
          ">
            <div style="
              background: ${infra.capacity > 0 ? (infra.used / infra.capacity > 0.8 ? '#ef4444' : '#10b981') : '#6b7280'};
              height: 100%;
              width: ${infra.capacity > 0 ? (infra.used / infra.capacity * 100) : 0}%;
              border-radius: 3px;
            "></div>
          </div>
        </div>
        
        <div style="margin-bottom: 6px; font-size: 12px;">
          <strong>Status:</strong> 
          <span style="
            color: ${infra.status === 'active' ? '#10b981' : infra.status === 'full' ? '#ef4444' : '#f59e0b'};
            font-weight: 600;
          ">
            ${infra.status.toUpperCase()}
          </span>
        </div>
        
        ${infra.address ? `
          <div style="margin-bottom: 6px; font-size: 11px; color: #6b7280;">
            📍 ${infra.address}
          </div>
        ` : ''}
        
        ${infra.notes ? `
          <div style="margin-top: 8px; font-size: 11px; color: #6b7280; font-style: italic;">
            ${infra.notes}
          </div>
        ` : ''}
        
      </div>
    `;

    marker.bindPopup(popupContent, {
      maxWidth: 250,
      className: 'custom-infra-popup'
    });

    return marker;
  };

  // Create popup content
  const createPopupContent = (devices: Device[]): string => {
    return devices.map((device, index) => {
      // Get additional device data from interface
      const firmwareVersion = device.info?.softwareVersion || 'N/A';
      const ssid5g = device.ssid5g || 'N/A';
      
      return `
        <div style="
          padding: 12px; 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          font-size: 13px; 
          line-height: 1.4;
          ${index > 0 ? 'border-top: 1px solid #e5e7eb; margin-top: 12px; padding-top: 12px;' : ''}
          min-width: 280px;
        ">
          <!-- Device Header -->
          <div style="
            font-weight: 700; 
            color: white;
            font-size: 16px;
            margin-bottom: 12px; 
            text-align: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 10px;
            border-radius: 8px;
            margin: -12px -12px 12px -12px;
          ">
            ${device.manufacturer}
          </div>
          
          <!-- Model -->
          <div style="margin-bottom: 6px; display: flex; justify-content: space-between;">
            <strong style="color: #374151;">Model:</strong> 
            <span style="color: #6b7280;">${device.modelName}</span>
          </div>
          
          <!-- Firmware -->
          <div style="margin-bottom: 6px; display: flex; justify-content: space-between;">
            <strong style="color: #374151;">Firmware:</strong> 
            <span style="color: #6b7280;">${firmwareVersion}</span>
          </div>
          
          <!-- Serial Number -->
          <div style="margin-bottom: 6px; display: flex; justify-content: space-between;">
            <strong style="color: #374151;">Serial Number:</strong> 
            <span style="color: #6b7280; font-family: monospace; font-size: 12px;">${device.serialNumber}</span>
          </div>
          
          <!-- Status -->
          <div style="margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
            <strong style="color: #374151;">Status:</strong> 
            <span style="
              color: ${device.status.isOnline ? '#10b981' : '#ef4444'}; 
              font-weight: 600;
              display: flex;
              align-items: center;
              gap: 4px;
            ">
              <span style="
                display: inline-block;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background-color: ${device.status.isOnline ? '#10b981' : '#ef4444'};
                box-shadow: 0 0 6px ${device.status.isOnline ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'};
              "></span>
              ${device.status.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          
          <!-- Client Name -->
          <div style="margin-bottom: 6px; display: flex; justify-content: space-between;">
            <strong style="color: #374151;">Client Name:</strong> 
            <span style="color: #6b7280;">${device.pppoeUsername}</span>
          </div>
          
          <!-- Client Phone -->
          <div style="margin-bottom: 6px; display: flex; justify-content: space-between;">
            <strong style="color: #374151;">Client Phone:</strong> 
            <span style="color: #6b7280;">${device.customerPhone}</span>
          </div>
          
          <!-- SSID 2G -->
          <div style="margin-bottom: 6px; display: flex; justify-content: space-between;">
            <strong style="color: #374151;">SSID 2G:</strong> 
            <span style="color: #6b7280; font-family: monospace; font-size: 12px;">${device.wifi?.ssid || 'N/A'}</span>
          </div>
          
          <!-- SSID 5G -->
          <div style="margin-bottom: 6px; display: flex; justify-content: space-between;">
            <strong style="color: #374151;">SSID 5G:</strong> 
            <span style="color: #6b7280; font-family: monospace; font-size: 12px;">${ssid5g}</span>
          </div>
          
          <!-- Rx Power -->
          ${device.status.rxPower ? `
            <div style="margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
              <strong style="color: #374151;">Rx Power:</strong> 
              <span style="
                color: ${device.status.rxPower < -25 ? '#ef4444' : device.status.rxPower < -20 ? '#f59e0b' : '#10b981'};
                font-weight: 600;
                font-family: monospace;
              ">
                ${device.status.rxPower} dBm
              </span>
            </div>
          ` : ''}
          
          <!-- Last Inform -->
          <div style="
            margin-top: 12px; 
            padding-top: 8px;
            border-top: 1px solid #e5e7eb;
            font-size: 11px; 
            color: #9ca3af;
            text-align: center;
          ">
            Last Inform: ${device.status.lastInform}
            ${device.status.timeDiffMinutes !== undefined ? ` (${device.status.timeDiffMinutes} min ago)` : ''}
          </div>
        </div>
      `;
    }).join('');
  };

  // Filter devices
  useEffect(() => {
    let filtered = devices;

    // Apply status filter
    if (activeFilter === 'online') {
      filtered = filtered.filter(d => d.status.isOnline);
    } else if (activeFilter === 'offline') {
      filtered = filtered.filter(d => !d.status.isOnline);
    } else if (activeFilter === 'with-location') {
      filtered = filtered.filter(d => d.hasLocation);
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(d => 
        d.serialNumber.toLowerCase().includes(search) ||
        d.pppoeUsername.toLowerCase().includes(search) ||
        d.customerPhone.includes(search) ||
        d.manufacturer.toLowerCase().includes(search)
      );
    }

    setFilteredDevices(filtered);
    
    // Only display on map if map instance is ready
    if (mapInstanceRef.current) {
      displayDevicesOnMap(filtered);
    } else {
      // console.log('🕰️ Map not ready yet, skipping displayDevicesOnMap in filter effect');
    }
  }, [devices, activeFilter, searchTerm]);

  // Auto-refresh effect
  useEffect(() => {
    const startAutoRefresh = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      if (autoRefresh && !isPaused) {
        intervalRef.current = setInterval(() => {
          loadMapData(true);
        }, 2 * 60 * 1000); // 2 minutes
      }
    };

    startAutoRefresh();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, isPaused]);

  // Pause auto-refresh during search interactions
  useEffect(() => {
    if (searchTerm || selectedDevice) {
      setIsPaused(true);
      const timer = setTimeout(() => {
        setIsPaused(false);
      }, 30000); // Resume after 30 seconds
      
      return () => clearTimeout(timer);
    } else {
      setIsPaused(false);
    }
  }, [searchTerm, selectedDevice]);


  // Format relative time
  const formatRelativeTime = (date: Date | null): string => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  // Parse coordinate input from various formats
  const parseCoordinateInput = (input: string): {lat: number, lng: number} | null => {
    if (!input.trim()) return null;

    try {
      // Remove extra spaces and normalize
      const normalized = input.trim().replace(/\s+/g, ' ');

      // Format 1: "lat, lng" or "lat,lng" (most common from Google Maps)
      const commaMatch = normalized.match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/);
      if (commaMatch) {
        const lat = parseFloat(commaMatch[1]);
        const lng = parseFloat(commaMatch[2]);
        if (isValidCoordinate(lat, lng)) {
          return { lat, lng };
        }
      }

      // Format 2: "lat lng" (space separated)
      const spaceMatch = normalized.match(/^(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)$/);
      if (spaceMatch) {
        const lat = parseFloat(spaceMatch[1]);
        const lng = parseFloat(spaceMatch[2]);
        if (isValidCoordinate(lat, lng)) {
          return { lat, lng };
        }
      }

      // Format 3: Google Maps URL format (various patterns)
      const urlPatterns = [
        /@(-?\d+\.\d+),(-?\d+\.\d+)/,  // @lat,lng
        /q=(-?\d+\.\d+),(-?\d+\.\d+)/, // q=lat,lng
        /ll=(-?\d+\.\d+),(-?\d+\.\d+)/, // ll=lat,lng
        /center=(-?\d+\.\d+),(-?\d+\.\d+)/ // center=lat,lng
      ];
      
      for (const pattern of urlPatterns) {
        const urlMatch = normalized.match(pattern);
        if (urlMatch) {
          const lat = parseFloat(urlMatch[1]);
          const lng = parseFloat(urlMatch[2]);
          if (isValidCoordinate(lat, lng)) {
            return { lat, lng };
          }
        }
      }

      // Format 4: Decimal degrees with direction (N/S E/W)
      const dmsMatch = normalized.match(/(-?\d+\.?\d*)\s*[Â°]?\s*([NS])?,?\s*(-?\d+\.?\d*)\s*[Â°]?\s*([EW])?/i);
      if (dmsMatch) {
        let lat = parseFloat(dmsMatch[1]);
        let lng = parseFloat(dmsMatch[3]);
        
        // Apply direction
        if (dmsMatch[2] && dmsMatch[2].toUpperCase() === 'S') lat = -Math.abs(lat);
        if (dmsMatch[4] && dmsMatch[4].toUpperCase() === 'W') lng = -Math.abs(lng);
        
        if (isValidCoordinate(lat, lng)) {
          return { lat, lng };
        }
      }

      return null;
    } catch (error) {
      console.error('Error parsing coordinates:', error);
      return null;
    }
  };

  // Validate coordinate ranges
  const isValidCoordinate = (lat: number, lng: number): boolean => {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  };

  // Format coordinates for display
  const formatCoordinateDisplay = (lat: number, lng: number): string => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  // Location Editor Modal functions
  const openLocationEditor = (device: Device) => {
    setSelectedDeviceForLocation(device);
    
    // Set existing location if available
    if (device.hasLocation && device.location) {
      setTempLocation({ lat: device.location.lat, lng: device.location.lng });
      setLocationAddress(device.location.address || '');
      setCoordinateInput(formatCoordinateDisplay(device.location.lat, device.location.lng));
    } else {
      setTempLocation(null);
      setLocationAddress('');
      setCoordinateInput('');
    }
    
    setIsLocationModalOpen(true);
  };

  const closeLocationEditor = () => {
    setIsLocationModalOpen(false);
    setSelectedDeviceForLocation(null);
    setTempLocation(null);
    setLocationAddress('');
    setCoordinateInput('');
    setIsLocationSaving(false);
  };

  const handleCoordinateInputChange = (value: string) => {
    setCoordinateInput(value);
    
    // Try to parse coordinates in real-time
    const parsed = parseCoordinateInput(value);
    if (parsed) {
      setTempLocation(parsed);
    }
  };

  const saveDeviceLocation = async () => {
    if (!selectedDeviceForLocation) {
      toast({
        title: "Error",
        description: "No device selected",
        variant: "destructive",
      });
      return;
    }

    // Try to parse coordinate input if tempLocation is not set
    let locationToSave = tempLocation;
    if (!locationToSave && coordinateInput) {
      locationToSave = parseCoordinateInput(coordinateInput);
    }

    if (!locationToSave) {
      toast({
        title: "Error",
        description: "Silakan masukkan koordinat yang valid atau pilih lokasi di peta",
        variant: "destructive",
      });
      return;
    }

    setIsLocationSaving(true);

    try {
      const response = await fetch('/api/admin/genieacs/locations/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: selectedDeviceForLocation.id,
          lat: locationToSave.lat,
          lng: locationToSave.lng,
          address: locationAddress,
          tag: `Map Location, ${selectedDeviceForLocation.customerPhone}`
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Location Saved",
          description: `Location saved for ${selectedDeviceForLocation.manufacturer}`,
        });
        
        // Refresh data to update UI
        await loadMapData(false);
        closeLocationEditor();
      } else {
        throw new Error(data.message || 'Failed to save location');
      }
    } catch (error) {
      console.error('Error saving location:', error);
      toast({
        title: "Error",
        description: "Failed to save device location",
        variant: "destructive",
      });
    } finally {
      setIsLocationSaving(false);
    }
  };

  const deleteDeviceLocation = async () => {
    if (!selectedDeviceForLocation) return;

    setIsLocationSaving(true);

    try {
      const response = await fetch(`/api/admin/genieacs/locations/${selectedDeviceForLocation.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Location Deleted",
          description: `Location removed for ${selectedDeviceForLocation.manufacturer}`,
        });
        
        // Refresh data to update UI
        await loadMapData(false);
        closeLocationEditor();
      } else {
        throw new Error(data.message || 'Failed to delete location');
      }
    } catch (error) {
      console.error('Error deleting location:', error);
      toast({
        title: "Error",
        description: "Failed to delete device location",
        variant: "destructive",
      });
    } finally {
      setIsLocationSaving(false);
    }
  };


  const focusOnDevice = (deviceId: string) => {
    if (!mapInstanceRef.current) return;
    
    const device = devices.find(d => d.id === deviceId);
    if (device?.hasLocation && device.location) {
      mapInstanceRef.current.setView([device.location.lat, device.location.lng], 16);
      setSelectedDevice(deviceId);
      
      // Find and open popup for this device
      markersRef.current.forEach(marker => {
        const markerLatLng = marker.getLatLng();
        if (Math.abs(markerLatLng.lat - device.location.lat) < 0.0001 && 
            Math.abs(markerLatLng.lng - device.location.lng) < 0.0001) {
          marker.openPopup();
        }
      });
    }
  };



  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <MapPin className="h-8 w-8 text-blue-600" />
            Map Monitoring
          </h1>
          <p className="text-muted-foreground mt-1">Real-time device location tracking</p>
        </div>
        <div className="flex flex-col gap-2 w-full sm:w-auto order-last md:order-none">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => loadMapData(false)}
              disabled={loading}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              onClick={() => setAutoRefresh(!autoRefresh)}
              size="sm"
              className="flex items-center gap-2"
            >
              <Activity className={`h-3 w-3 ${autoRefresh && !isPaused ? 'animate-pulse text-green-400' : ''}`} />
              Auto
            </Button>
          </div>
          {(lastRefresh || connectionError) && (
            <div className="text-xs text-center">
              {connectionError ? (
                <div className="text-red-500 flex items-center justify-center gap-1">
                  <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  Connection error (retry {retryCount}/3)
                </div>
              ) : lastRefresh ? (
                <div className="text-muted-foreground">
                  Last refresh: {formatRelativeTime(lastRefresh)}
                  {isPaused && <span className="text-orange-500 ml-1">(Paused)</span>}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs md:text-sm">Total Devices</p>
                <p className="text-xl md:text-3xl font-bold">{stats.total}</p>
              </div>
              <Router className="h-6 w-6 md:h-8 md:w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs md:text-sm">Online</p>
                <p className="text-xl md:text-3xl font-bold">{stats.online}</p>
              </div>
              <Wifi className="h-6 w-6 md:h-8 md:w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-xs md:text-sm">Offline</p>
                <p className="text-xl md:text-3xl font-bold">{stats.offline}</p>
              </div>
              <WifiOff className="h-6 w-6 md:h-8 md:w-8 text-red-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-xs md:text-sm">With Location</p>
                <p className="text-xl md:text-3xl font-bold">{stats.withLocation}</p>
              </div>
              <MapPin className="h-6 w-6 md:h-8 md:w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs md:text-sm">ODP Points</p>
                <p className="text-xl md:text-3xl font-bold">{infraStats.odp.total}</p>
                <p className="text-xs text-purple-200 mt-1">
                  {infraStats.odp.active} Active • {infraStats.odp.full} Full
                </p>
              </div>
              <Building className="h-6 w-6 md:h-8 md:w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-xs md:text-sm">ODC Centers</p>
                <p className="text-xl md:text-3xl font-bold">{infraStats.odc.total}</p>
                <p className="text-xs text-indigo-200 mt-1">
                  {infraStats.odc.active} Active • {infraStats.odc.expansion} Expanding
                </p>
              </div>
              <Zap className="h-6 w-6 md:h-8 md:w-8 text-indigo-200" />
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Unified Responsive Layout */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Control Panel - Show first on mobile, first on desktop */}
        <div className="lg:basis-[33%]">
          <Card className="h-[70vh] lg:h-[600px] min-h-[480px] flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 overflow-hidden flex flex-col">
              {/* Search */}
              <div>
                <label className="text-sm font-medium mb-2 block">Search Devices</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Serial, PPPoE, Phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Filters */}
              <div>
                <label className="text-sm font-medium mb-2 block">Filter Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={activeFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveFilter('all')}
                    className="text-xs"
                  >
                    All
                  </Button>
                  <Button
                    variant={activeFilter === 'online' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveFilter('online')}
                    className="text-xs"
                  >
                    <Wifi className="h-3 w-3 mr-1" />
                    Online
                  </Button>
                  <Button
                    variant={activeFilter === 'offline' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveFilter('offline')}
                    className="text-xs"
                  >
                    <WifiOff className="h-3 w-3 mr-1" />
                    Offline
                  </Button>
                  <Button
                    variant={activeFilter === 'with-location' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveFilter('with-location')}
                    className="text-xs"
                  >
                    <MapPin className="h-3 w-3 mr-1" />
                    Located
                  </Button>
                </div>
              </div>

              {/* Device List */}
              <div className="flex-1 flex flex-col min-h-0">
                <label className="text-sm font-medium mb-2 block flex-shrink-0">
                  Devices ({filteredDevices.length})
                </label>
                <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                  {loading ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
                      Loading devices...
                    </div>
                  ) : filteredDevices.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      No devices found
                    </div>
                  ) : (
                    filteredDevices.map(device => (
                      <div
                        key={device.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted ${
                          selectedDevice === device.id ? 'border-blue-500 bg-blue-50' : ''
                        }`}
                        onClick={() => openLocationEditor(device)}
                      >
                        {/* Status Badge at Top */}
                        <div className="flex items-center justify-between mb-2">
                          <div
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              device.status.isOnline 
                                ? 'bg-green-500 text-white' 
                                : 'bg-red-500 text-white'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full mr-1 ${
                              device.status.isOnline ? 'bg-green-200' : 'bg-red-200'
                            }`} />
                            {device.status.isOnline ? 'Online' : 'Offline'}
                            {device.status.timeDiffMinutes !== undefined && ` (${device.status.timeDiffMinutes}m)`}
                          </div>
                          {device.hasLocation && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                focusOnDevice(device.id);
                              }}
                            >
                              <Navigation className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        
                        {/* Manufacturer */}
                        <div className="mb-1">
                          <span className="font-medium text-sm text-gray-800">
                            {device.manufacturer}
                          </span>
                        </div>
                        
                        {/* Device Details */}
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {device.pppoeUsername}
                          </div>
                          {device.customerPhone !== '-' && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {device.customerPhone}
                            </div>
                          )}
                          {device.status.rxPower && (
                            <div className="flex items-center gap-1">
                              <Activity className="h-3 w-3" />
                              <span className={
                                device.status.rxPower < -25 ? 'text-red-600' :
                                device.status.rxPower < -20 ? 'text-yellow-600' : 'text-green-600'
                              }>
                                {device.status.rxPower} dBm
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map - Show second on mobile, second on desktop */}
        <div className="lg:basis-[67%]">
          <Card className="h-[70vh] lg:h-[600px] min-h-[480px]">
            <CardContent className="p-0 h-full">
              <div ref={mapRef} className="w-full h-full rounded-lg"/> {loading && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                  <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
                    <p className="text-muted-foreground">Loading map data...</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Location Editor Modal */}
      <Dialog open={isLocationModalOpen} onOpenChange={closeLocationEditor}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Edit Location - {selectedDeviceForLocation?.manufacturer}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {selectedDeviceForLocation?.serialNumber} {selectedDeviceForLocation?.pppoeUsername}
            </p>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Map Section */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Click on map to select location</Label>
                <div 
                  className="w-full h-80 border rounded-lg overflow-hidden"
                  id="location-editor-map"
                />
              </div>
            </div>

            {/* Form Section */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="coordinate-input" className="text-sm font-medium">
                  Koordinat (Latitude, Longitude)
                </Label>
                <Input
                  id="coordinate-input"
                  type="text"
                  placeholder="Contoh: -7.199102, 107.94646 atau copy dari Google Maps"
                  value={coordinateInput}
                  onChange={(e) => handleCoordinateInputChange(e.target.value)}
                  className={`mt-1 ${
                    coordinateInput && !tempLocation 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : coordinateInput && tempLocation
                      ? 'border-green-300 focus:border-green-500 focus:ring-green-200'
                      : ''
                  }`}
                />
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Format yang didukung:
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-0.5 ml-2">
                    <li> -7.199102, 107.94646 (dari Google Maps)</li>
                    <li> -7.199102 107.94646 (spasi)</li>
                    <li> URL Google Maps (otomatis extract)</li>
                  </ul>
                  {coordinateInput && tempLocation && (
                    <p className="text-xs text-green-600 font-medium">
                      âœ“ Koordinat valid: {formatCoordinateDisplay(tempLocation.lat, tempLocation.lng)}
                    </p>
                  )}
                  {coordinateInput && !tempLocation && (
                    <p className="text-xs text-red-600">
                      âœ— Format koordinat tidak valid
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="address-input">Address (Optional)</Label>
                <Input
                  id="address-input"
                  placeholder="Enter address or location description"
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                />
              </div>

              {selectedDeviceForLocation?.hasLocation && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Current Location</span>
                  </div>
                  <p className="text-sm text-blue-600">
                    {selectedDeviceForLocation.location?.lat.toFixed(6)}, {selectedDeviceForLocation.location?.lng.toFixed(6)}
                  </p>
                  {selectedDeviceForLocation.location?.address && (
                    <p className="text-xs text-blue-500 mt-1">
                      {selectedDeviceForLocation.location.address}
                    </p>
                  )}
                </div>
              )}

              <div className="p-4 bg-gray-50 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Router className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-800">Device Info</span>
                </div>
                <div className="space-y-1 text-xs text-gray-600">
                  <p><strong>PPPoE:</strong> {selectedDeviceForLocation?.pppoeUsername}</p>
                  <p><strong>Phone:</strong> {selectedDeviceForLocation?.customerPhone}</p>
                  <p><strong>Status:</strong> 
                    <span className={`ml-1 ${selectedDeviceForLocation?.status.isOnline ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedDeviceForLocation?.status.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            {selectedDeviceForLocation?.hasLocation && (
              <Button
                variant="destructive"
                onClick={deleteDeviceLocation}
                disabled={isLocationSaving}
                className="mr-auto"
              >
                {isLocationSaving ? 'Deleting...' : 'Delete Location'}
              </Button>
            )}
            
            <Button variant="outline" onClick={closeLocationEditor}>
              Cancel
            </Button>
            
            <Button 
              onClick={saveDeviceLocation} 
              disabled={(!tempLocation && !coordinateInput) || isLocationSaving}
            >
              {isLocationSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Location'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// Extend Window interface for Leaflet and global functions
declare global {
  interface Window {
    L: any;
    updateInfraField: (id: string, type: 'ODP' | 'ODC', field: string, value: any) => void;
    markAsFull: (id: string, type: 'ODP' | 'ODC') => void;
    addPorts: (id: string, type: 'ODP' | 'ODC', increment: number) => void;
    resetUsage: (id: string, type: 'ODP' | 'ODC') => void;
  }
}