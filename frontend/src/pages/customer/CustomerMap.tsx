import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Swal from 'sweetalert2';
import { useDeviceMap, DeviceData } from '@/hooks/useDeviceMap';
import DeviceInfoPanel from '@/components/DeviceInfoPanel';

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

  /* Dark mode overrides for Leaflet */
  .dark .leaflet-container {
    background: #1f2937 !important;
  }
  .dark .leaflet-control-container .leaflet-control {
    background: #374151 !important;
    color: #d1d5db !important;
  }
  .dark .leaflet-control-container .leaflet-control a {
    color: #d1d5db !important;
  }
  .dark .leaflet-control-container .leaflet-control a:hover {
    color: #60a5fa !important;
  }
  .dark .leaflet-popup-content-wrapper {
    background: #1f2937 !important;
    color: #d1d5db !important;
  }
  .dark .leaflet-popup-tip {
    background: #1f2937 !important;
  }
  .dark .leaflet-popup-content {
    color: #d1d5db !important;
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

// Style kontainer peta
const getMapContainerStyle = (): React.CSSProperties => {
  const dark = isDarkMode();
  return {
    height: '100%',
    minHeight: '500px',
    width: '100%',
    backgroundColor: dark ? '#1f2937' : '#f0f0f0',
    border: `2px solid ${dark ? '#374151' : '#e0e0e0'}`,
    position: 'relative' as const,
    zIndex: 1
  };
};

// Import marker icons
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const isDarkMode = () => document.documentElement.classList.contains('dark');

const createPopupHeader = (manufacturer: string, accentColor: string) => (
  `<h6 style="margin: 0 0 10px 0; color: ${accentColor}; font-weight: 600; font-size: 16px;">
    <i class="router-icon" style="margin-right: 8px;">📡</i>ONU ${manufacturer}
  </h6>`
);

const createPopupInfoRow = (label: string, value: string, mutedTextColor: string, textColor: string) => (
  `<div style="margin-bottom: 8px; display: flex; justify-content: space-between;">
    <strong style="color: ${mutedTextColor};">${label}:</strong>
    <small style="color: ${textColor};">${value}</small>
  </div>`
);

const createPopupStatusSection = (status: DeviceData['status'], colors: any) => (
  `<div style="margin-bottom: 12px; padding: 8px; background: ${status.isOnline ? colors.statusBgOnline : colors.statusBgOffline}; border-radius: 6px;">
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
  </div>`
);

const createPopupRxPower = (rxPower: number, colors: any) => {

  const color = rxPower < -25 ? '#ef4444' : rxPower < -20 ? '#f59e0b' : '#10b981';
  return `
    <div style="margin-bottom: 8px; display: flex; justify-content: space-between;">
      <strong style="color: ${colors.text}">Rx Power:</strong>
      <span style="color: ${color}; font-weight: 600;">
        ${rxPower} dBm
      </span>
    </div>
  `;
};

const createPopupLocationSection = (location: DeviceData['location'], colors: any) => {
  if (!location.address) return '';
  return `
    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid ${colors.border};">
      <strong style="color: ${colors.mutedText}; display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
        📍 Address:
      </strong>
      <small style="color: ${colors.text}; line-height: 1.4;">${location.address}</small>
    </div>
  `;
};

const createCustomMarker = (device: DeviceData): L.DivIcon => {
  const { status } = device;
  const dark = isDarkMode();
  const hasOnlineDevice = status.isOnline;
  const colors = {
    online: dark ? '#1e293b' : '#10b981',
    offline: dark ? '#991b1b' : '#ef4444',
  };
  const markerColor = status.isOnline ? colors.online : colors.offline;
  const filterId = `shadow-customer-${device.info.serialNumber.replace(/[^a-zA-Z0-9]/g, '')}`;
  const strokeColor = dark ? '#d1d5db' : 'white';
  const routerIconSVG = `
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="${filterId}" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.4)"/>
        </filter>
      </defs>
      <circle cx="16" cy="16" r="12" fill="${markerColor}" stroke="${strokeColor}" stroke-width="2" filter="url(#${filterId})"/>
      <rect x="9" y="14" width="14" height="6" rx="1" ry="1" fill="${strokeColor}"/>
      <path d="M11 14 L11 10" stroke="${strokeColor}" stroke-width="1.5" stroke-linecap="round" fill="none"/>
      <path d="M16 14 L16 9" stroke="${strokeColor}" stroke-width="1.5" stroke-linecap="round" fill="none"/>
      <path d="M21 14 L21 10" stroke="${strokeColor}" stroke-width="1.5" stroke-linecap="round" fill="none"/>
      <circle cx="11.5" cy="16.5" r="0.8" fill="${markerColor}"/>
      <rect x="14" y="16" width="1.5" height="1" fill="${markerColor}" rx="0.2"/>
      <rect x="16" y="16" width="1.5" height="1" fill="${markerColor}" rx="0.2"/>
      <rect x="18" y="16" width="1.5" height="1" fill="${markerColor}" rx="0.2"/>
      <rect x="20" y="16" width="1.5" height="1" fill="${markerColor}" rx="0.2"/>
      ${hasOnlineDevice ? `<path d="M24 15 Q25.5 16 24 17" stroke="${strokeColor}" stroke-width="1" fill="none" opacity="0.9"/><path d="M25 14.5 Q26.5 16 25 17.5" stroke="${strokeColor}" stroke-width="0.8" fill="none" opacity="0.7"/>` : ''}
    </svg>
  `;
  
  return L.divIcon({
    className: 'customer-router-marker',
    html: `<div class="router-marker-container" style="position: relative; cursor: pointer; transition: transform 0.2s ease;">${routerIconSVG}</div><style>.customer-router-marker { background: transparent !important; border: none !important; box-shadow: none !important; } .router-marker-container:hover { transform: scale(1.1); }</style>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
};

const createPopupContent = (device: DeviceData): string => {
  const { status, info, manufacturer, pppoeUsername, location } = device;
  const dark = isDarkMode();

  const colors = {
    text: dark ? '#d1d5db' : '#374151',
    mutedText: dark ? '#9ca3af' : '#6b7280',
    accent: dark ? '#60a5fa' : '#4361ee',
    statusBgOnline: dark ? '#064e3b' : '#f0fdf4',
    statusBgOffline: dark ? '#7f1d1d' : '#fef2f2',
    border: dark ? '#374151' : '#e5e7eb',
    popupBg: dark ? '#1f2937' : '#ffffff',
  };

  const parts = [
    createPopupHeader(manufacturer, colors.accent),
    createPopupInfoRow('Model:', info.modelName, colors.mutedText, colors.text),
    createPopupInfoRow('Firmware:', info.softwareVersion, colors.mutedText, colors.text),
    createPopupInfoRow('Serial Number:', info.serialNumber, colors.mutedText, colors.text),
    createPopupStatusSection(status, colors),
    status.rxPower ? createPopupRxPower(status.rxPower, colors) : '',
    createPopupInfoRow('Client Name:', pppoeUsername, colors.mutedText, colors.text),
    createPopupInfoRow('Last Inform:', status.lastInform, colors.mutedText, colors.text),
    createPopupLocationSection(location, colors)
  ];

  return `<div style="padding: 15px; font-family: 'Segoe UI', sans-serif; min-width: 250px; color: ${colors.text}; background-color: ${colors.popupBg};">
    ${parts.join('')}
  </div>`;
};

export default function CustomerMap() {
  const navigate = useNavigate();
  const { device, loading, error } = useDeviceMap();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<DeviceData | null>(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  
  // Inject CSS overrides when component mounts
  useEffect(() => {
    if (!document.getElementById('leaflet-z-index-fix')) {
      const style = document.createElement('style');
      style.id = 'leaflet-z-index-fix';
      style.textContent = leafletMapCSSOverrides;
      document.head.appendChild(style);
    }
    
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: markerIcon2x,
      iconUrl: markerIcon,
      shadowUrl: markerShadow,
    });
  }, []);
  
  const mapRefCallback = (element: HTMLDivElement | null) => {
    if (element && !mapInitialized) {
      mapRef.current = element;
      setTimeout(initializeMapFromCallback, 10);
    }
  };
  
  const initializeMapFromCallback = () => {
    if (!mapRef.current || mapInitialized) return;
    setMapInitialized(true);
    initializeMapInstance();
  };
  
  const initializeMapInstance = () => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const defaultCenter: [number, number] = [-7.198741, 107.946458];
    const defaultZoom = 5;
    const map = L.map(mapRef.current, {
      center: defaultCenter,
      zoom: defaultZoom,
      zoomControl: true,
      scrollWheelZoom: true,
    });
    
    const tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles © <a href="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer">Esri</a>',
      maxZoom: 19
    });
    tileLayer.addTo(map);
    L.control.scale().addTo(map);

    mapInstanceRef.current = map;
    setTimeout(() => {
      if (map) {
        map.invalidateSize();
        if (device) {
          displayDeviceOnMap(device);
        }
      }
    }, 50);
  };

  useEffect(() => {
    if (mapInitialized || mapInstanceRef.current) return;
    const initializeMapWithDelay = () => {
      if (!mapRef.current) {
        setTimeout(initializeMapWithDelay, 50);
        return;
      }
      initializeMapInstance();
    };
    initializeMapWithDelay();
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setMapInitialized(false);
      }
    };
  }, []);

  useEffect(() => {
    if (!device) return;
    if (!mapInstanceRef.current || !mapInitialized) {
      const waitForMap = () => {
        if (mapInstanceRef.current && mapInitialized && device) {
          displayDeviceOnMap(device);
        } else if (device) {
          setTimeout(waitForMap, 100);
        }
      };
      waitForMap();
      return;
    }
    displayDeviceOnMap(device);
  }, [device, mapInitialized]);

  // Handle error with SweetAlert
  useEffect(() => {
    if (!error) return;
    let errorTitle = 'Error';
    let errorMessage = error;
    let errorIcon: 'error' | 'info' | 'warning' = 'error';
    if (error.includes('not found')) { /* ... */ }
    else if (error.includes('Location not available') || error.includes('Location unavailable')) { /* ... */ }
    else if (error.includes('GenieACS service is unavailable')) { /* ... */ }

    const dark = isDarkMode();
    Swal.fire({
      icon: errorIcon,
      title: errorTitle,
      html: `
        <div style="text-align: left; color: ${dark ? '#d1d5db' : '#374151'};">
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
      cancelButtonColor: '#6b7280',
      background: dark ? '#1f2937' : '#ffffff',
      color: dark ? '#d1d5db' : '#374151',
    }).then((result) => {
      if (result.dismiss === Swal.DismissReason.cancel) {
        navigate('/customer/trouble');
      }
    });
  }, [error, navigate]);

  const displayDeviceOnMap = (device: DeviceData) => {
    if (!mapInstanceRef.current) return;
    const { location } = device;
    const map = mapInstanceRef.current;
    if (markerRef.current) { map.removeLayer(markerRef.current); }
    const markerIcon = createCustomMarker(device);
    const marker = L.marker([location.lat, location.lng], { icon: markerIcon }).addTo(map);
    const popupContent = createPopupContent(device);
    marker.bindPopup(popupContent, { className: 'custom-popup', maxWidth: 300 });
    map.setView([location.lat, location.lng], 15);
    marker.on('click', function() { setSelectedDevice(device); });
    markerRef.current = marker;
    setSelectedDevice(device);
  };

  const handleResize = () => {
    if (mapInstanceRef.current) { mapInstanceRef.current.invalidateSize(); }
  };
  useEffect(() => { window.addEventListener('resize', handleResize); return () => window.removeEventListener('resize', handleResize); }, []);

  const showProgressiveLoading = loading && !mapInitialized;
  
  if (showProgressiveLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <DeviceInfoPanel device={selectedDevice} loading={loading} />
      <div className="flex-1 order-1 lg:order-2 p-4">
        <div className="w-full h-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden relative">
          {loading && !mapInitialized && (
            <div className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-90 flex items-center justify-center z-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading device data...</p>
              </div>
            </div>
          )}
          <div ref={mapRefCallback} className="w-full h-full map-container-fix" style={getMapContainerStyle()} />
        </div>
      </div>
    </div>
  );
}
