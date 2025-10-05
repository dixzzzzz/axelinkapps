import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Swal from 'sweetalert2';
import { useDeviceMap, DeviceData } from '../../hooks/useDeviceMap';
import DeviceInfoPanel from '../../components/DeviceInfoPanel';

// CSS overrides to fix z-index issues with mobile sidebar
const leafletMapCSSOverrides = `
  /* Fix Leaflet z-index hierarchy to prevent conflicts with mobile sidebar */
  .leaflet-container {
    z-index: 1 !important;
  }
  .leaflet-control-container {
    z-index: 2 !important;
  }
  .leaflet-popup {
    z-index: 10 !important;
  }
  .leaflet-marker-pane {
    z-index: 5 !important;
  }
  .leaflet-shadow-pane {
    z-index: 4 !important;
  }
  .leaflet-overlay-pane {
    z-index: 3 !important;
  }
  .leaflet-tile-pane {
    z-index: 1 !important;
  }
  
  /* Critical: Ensure map never goes above mobile sidebar */
  @media (max-width: 1024px) {
    .map-container-fix {
      z-index: 1 !important;
      position: relative !important;
    }
    .map-container-fix .leaflet-container {
      z-index: 1 !important;
      position: relative !important;
    }
    .leaflet-control-container {
      z-index: 2 !important;
    }
    .leaflet-popup {
      z-index: 10 !important;
    }
    /* Ensure all leaflet elements stay below mobile sidebar (z-60) */
    .leaflet-pane {
      z-index: 1 !important;
    }
    /* Force all Leaflet elements to have lower z-index than sidebar */
    .leaflet-map-pane,
    .leaflet-tile,
    .leaflet-layer,
    .leaflet-control-zoom,
    .leaflet-control,
    .leaflet-top,
    .leaflet-bottom,
    .leaflet-left,
    .leaflet-right {
      z-index: 1 !important;
    }
    /* Additional safety for any high z-index Leaflet elements */
    div[class*="leaflet"] {
      z-index: 1 !important;
    }
  }
`;

// CSS injection will be moved to useEffect to avoid module-level execution

// Add additional CSS to ensure map container has proper styling
const mapContainerStyle = {
  height: '100%',
  minHeight: '500px',
  width: '100%',
  backgroundColor: '#f0f0f0', // Fallback background
  border: '2px solid #e0e0e0', // Debug border
  // Fix z-index issue with mobile sidebar
  position: 'relative' as const,
  zIndex: 1
} as React.CSSProperties;

// Import marker icons
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Icon fix will be moved to useEffect

export default function CustomerMap() {
  // Distinctive debug log for customer map component
  // console.log('👤 CUSTOMER CustomerMap component loaded!');
  
  const navigate = useNavigate();
  const { device, loading, error } = useDeviceMap();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<DeviceData | null>(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  
  // console.log('🗺️ CustomerMap component rendered with z-index fixes for mobile sidebar');
  
  // Inject CSS overrides when component mounts
  useEffect(() => {
    // Debug: Ensure Leaflet CSS is loaded
    // console.log('🍃 Leaflet CSS imported');
    
    // Inject CSS overrides
    if (!document.getElementById('leaflet-z-index-fix')) {
      const style = document.createElement('style');
      style.id = 'leaflet-z-index-fix';
      style.textContent = leafletMapCSSOverrides;
      document.head.appendChild(style);
    }
    
    // Fix default Leaflet markers
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: markerIcon2x,
      iconUrl: markerIcon,
      shadowUrl: markerShadow,
    });
  }, []);
  
  // Ref callback method sebagai backup
  const mapRefCallback = (element: HTMLDivElement | null) => {
    // console.log('🔄 Map ref callback triggered with element:', element);
    if (element && !mapInitialized) {
      // console.log('🎯 Initializing map via ref callback...');
      mapRef.current = element;
      // Reduced delay for faster initialization
      setTimeout(initializeMapFromCallback, 10);
    }
  };
  
  const initializeMapFromCallback = () => {
    if (!mapRef.current || mapInitialized) return;
    
    // console.log('🚀 Starting map initialization from callback...');
    setMapInitialized(true);
    initializeMapInstance();
  };
  
  const initializeMapInstance = () => {
    if (!mapRef.current || mapInstanceRef.current) {
      // console.log('⚠️ Map already initialized or no container available');
      return;
    }
    
    // console.log('✅ Initializing Leaflet map instance...');
    
    // Default center (Garut, Indonesia)
    const defaultCenter: [number, number] = [-7.198741, 107.946458];
    const defaultZoom = 5;

    // console.log('🎯 Creating Leaflet map instance...');
    const map = L.map(mapRef.current, {
      center: defaultCenter,
      zoom: defaultZoom,
      zoomControl: true,
      scrollWheelZoom: true,
    });
    
    // console.log('✅ Leaflet map instance created');
    // console.log('🗺️ Map container dimensions:', {
    //   width: mapRef.current.offsetWidth,
    //   height: mapRef.current.offsetHeight
    // });

    // Add ArcGIS World Imagery tiles (same as EJS version)
    // console.log('🌍 Adding tile layer...');
    const tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles © <a href="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer">Esri</a>',
      maxZoom: 19
    });
    
    // tileLayer.on('loading', () => console.log('🔄 Tiles loading...'));
    // tileLayer.on('load', () => console.log('✅ Tiles loaded successfully'));
    tileLayer.addTo(map);

    // Add scale control
    // console.log('📏 Adding scale control...');
    L.control.scale().addTo(map);

    mapInstanceRef.current = map;
    // console.log('✅ Map initialization completed successfully');
    
    // Force map to recalculate size with reduced delay
    setTimeout(() => {
      if (map) {
        // console.log('🔄 Forcing map size recalculation...');
        map.invalidateSize();
        // console.log('✅ Map size invalidated');
        
        // If device data is already available, display it
        if (device) {
          // console.log('🗺️ Device data available, displaying on map...');
          displayDeviceOnMap(device);
        }
      }
    }, 50);
  };

  // Initialize map once on component mount
  useEffect(() => {
    // console.log('🗺️ Map initialization useEffect triggered');
    
    // Prevent re-initialization if map is already initialized
    if (mapInitialized || mapInstanceRef.current) {
      // console.log('⚠️ Map already initialized, skipping...');
      return;
    }
    
    const initializeMapWithDelay = () => {
      if (!mapRef.current) {
        // console.log('❌ mapRef.current is null, retrying in 50ms...');
        setTimeout(initializeMapWithDelay, 50);
        return;
      }

      // Initialize via common function
      initializeMapInstance();
    };

    // Start initialization
    initializeMapWithDelay();

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        // console.log('🧵 Cleaning up map instance...');
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setMapInitialized(false);
      }
    };
  }, []); // Empty dependency array to run only once

  // Handle device data and display on map (only when device changes)
  useEffect(() => {
    // console.log('📦 Device useEffect triggered');
    // console.log('  Device data:', device);
    // console.log('  Map instance:', !!mapInstanceRef.current);
    
    if (!device) {
      // console.log('⚠️ No device data available');
      return;
    }
    
    if (!mapInstanceRef.current || !mapInitialized) {
      // console.log('⚠️ Map not ready yet, waiting...');
      // Wait for map to be ready and retry
      const waitForMap = () => {
        if (mapInstanceRef.current && mapInitialized && device) {
          // console.log('🗺️ Map ready, displaying device...');
          displayDeviceOnMap(device);
        } else if (device) {
          setTimeout(waitForMap, 100);
        }
      };
      waitForMap();
      return;
    }

    // console.log('🗺️ Displaying device on map...');
    displayDeviceOnMap(device);
  }, [device, mapInitialized]); // Add mapInitialized to dependencies

  // Handle error with SweetAlert
  useEffect(() => {
    if (!error) return;

    // console.error('❌ Error loading device data:', error);

    // Determine error type and customize message
    let errorTitle = 'Error';
    let errorMessage = error;
    let errorIcon: 'error' | 'info' | 'warning' = 'error';

    if (error.includes('not found')) {
      errorTitle = 'Device Not Found';
      errorIcon = 'info';
      errorMessage = 'Your device is not registered in the system or not connected to the server. Please contact the admin for registration.';
    } else if (error.includes('Location not yet available') || error.includes('Location unavailable')) {
      errorTitle = 'Location not set yet';
      errorIcon = 'warning';
      errorMessage = 'Your device\'s location has not been set by the admin. Please contact the admin to configure your device\'s location.';
    } else if (error.includes('GenieACS service is unavailable')) {
      errorTitle = 'Service unavailable';
      errorIcon = 'error';
      errorMessage = 'Monitoring service is currently unavailable. Please try again in a few minutes.';
    }

    Swal.fire({
      icon: errorIcon,
      title: errorTitle,
      html: `
        <div style="text-align: left;">
          <p><strong>Detail:</strong> ${errorMessage}</p>
          <hr>
          <p><small><strong>Solution:</strong></small></p>
          <ul style="font-size: 0.9em; margin: 0; padding-left: 20px;">
            <li>Ensure your device is properly installed and powered on</li>
            <li>Check your internet connection</li>
            <li>Contact the admin if the problem persists</li>
          </ul>
        </div>
      `,
      confirmButtonText: 'OK',
      showCancelButton: true,
      cancelButtonText: 'Contact Admin',
      reverseButtons: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280'
    }).then((result) => {
      if (result.dismiss === Swal.DismissReason.cancel) {
        // Redirect to trouble report
        navigate('/customer/trouble');
      }
    });
  }, [error]);

  const createCustomMarker = (device: DeviceData): L.DivIcon => {
    const { status } = device;
    const markerColor = status.isOnline ? '#10b981' : '#ef4444'; // Green for online, red for offline
    const hasOnlineDevice = status.isOnline;
    
    // Create unique ID for this marker's filter
    const filterId = `shadow-customer-${device.info.serialNumber.replace(/[^a-zA-Z0-9]/g, '')}`;
    
    // Create router icon SVG with circular background
    const routerIconSVG = `
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
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
    
    return L.divIcon({
      className: 'customer-router-marker',
      html: `
        <div class="router-marker-container" style="
          position: relative;
          cursor: pointer;
          transition: transform 0.2s ease;
        ">
          ${routerIconSVG}
        </div>
        <style>
          .customer-router-marker {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
          }
          .router-marker-container:hover {
            transform: scale(1.1);
          }
        </style>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
  };

  const createPopupContent = (device: DeviceData): string => {
    const { status, info, manufacturer, pppoeUsername, location } = device;

    return `
      <div style="padding: 15px; font-family: 'Segoe UI', sans-serif; min-width: 250px;">
        <h6 style="margin: 0 0 10px 0; color: #4361ee; font-weight: 600; font-size: 16px;">
          <i class="router-icon" style="margin-right: 8px;">📡</i>ONU ${manufacturer}
        </h6>

        <div style="margin-bottom: 8px; display: flex; justify-content: space-between;">
          <strong style="color: #666;">Model:</strong>
          <small style="color: #333;"> ${info.modelName} </small>
        </div>

        <div style="margin-bottom: 8px; display: flex; justify-content: space-between;">
          <strong style="color: #666;">Firmware:</strong>
          <small style="color: #333;"> ${info.softwareVersion} </small>
        </div>

        <div style="margin-bottom: 8px; display: flex; justify-content: space-between;">
          <strong style="color: #666;">Serial Number:</strong>
          <small style="color: #333; font-family: monospace;"> ${info.serialNumber}</small>
        </div>

        <div style="margin-bottom: 12px; padding: 8px; background: ${status.isOnline ? '#f0fdf4' : '#fef2f2'}; border-radius: 6px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="
              display: inline-block;
              width: 12px;
              height: 12px;
              border-radius: 50%;
              background-color: ${status.isOnline ? '#10b981' : '#ef4444'};
              box-shadow: 0 0 10px ${status.isOnline ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'};
            "></span>
            <strong>Status:</strong>
            <span style="color: ${status.isOnline ? '#059669' : '#dc2626'}; font-weight: 600;">
              ${status.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        ${status.rxPower ? `
          <div style="margin-bottom: 8px; display: flex; justify-content: space-between;">
            <strong style="color: #666;">Rx Power:</strong>
            <span style="color: ${status.rxPower < -25 ? '#ef4444' : status.rxPower < -20 ? '#f59e0b' : '#10b981'}; font-weight: 600;">
              ${status.rxPower} dBm
            </span>
          </div>
        ` : ''}

        <div style="margin-bottom: 8px; display: flex; justify-content: space-between;">
          <strong style="color: #666;">Client Name:</strong>
          <span style="color: #333;"> ${pppoeUsername} </span>
        </div>

        <div style="margin-bottom: 8px; display: flex; justify-content: space-between;">
          <strong style="color: #666;">Last Inform:</strong>
          <small style="color: #333;"> ${status.lastInform} </small>
        </div>

        ${location.address ? `
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
            <strong style="color: #666; display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
              📍 Address:
            </strong>
            <small style="color: #333; line-height: 1.4;"> ${location.address} </small>
          </div>
        ` : ''}
      </div>
    `;
  };

  const displayDeviceOnMap = (device: DeviceData) => {
    // console.log('📍 displayDeviceOnMap called with device:', device);
    
    if (!mapInstanceRef.current) {
      // console.log('❌ Map instance not available in displayDeviceOnMap');
      return;
    }

    const { location } = device;
    const map = mapInstanceRef.current;
    
    // console.log('🗺️ Device location:', location);

    // Remove existing marker
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
    }

    // Create custom marker
    const markerIcon = createCustomMarker(device);
    
    const marker = L.marker([location.lat, location.lng], {
      icon: markerIcon
    }).addTo(map);

    // Create popup content
    const popupContent = createPopupContent(device);
    marker.bindPopup(popupContent, {
      className: 'custom-popup',
      maxWidth: 300
    });

    // Center map on device location
    map.setView([location.lat, location.lng], 15);

    // Update selected device and add click event
    marker.on('click', function() {
      setSelectedDevice(device);
    });

    // Store marker reference
    markerRef.current = marker;

    // Auto-select device for info panel
    setSelectedDevice(device);
  };

  const handleResize = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
    }
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Progressive loading: Show map container while loading device data
  const showProgressiveLoading = loading && !mapInitialized;
  
  if (showProgressiveLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Info Panel - Mobile: Top, Desktop: Left */}
      <DeviceInfoPanel device={selectedDevice} loading={loading} />

      {/* Map Container */}
      <div className="flex-1 order-1 lg:order-2 p-4">
        <div className="w-full h-full bg-white rounded-2xl shadow-lg overflow-hidden relative">
          {/* Loading overlay for device data (only on initial load) */}
          {loading && !mapInitialized && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Loading device data...</p>
              </div>
            </div>
          )}
          
          <div
            ref={mapRefCallback}
            className="w-full h-full map-container-fix"
            style={mapContainerStyle}
          />
        </div>
      </div>
    </div>
  );
}
