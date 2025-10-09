import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Router, 
  Cpu, 
  Settings, 
  Scan, 
  User, 
  Clock, 
  MapPin, 
  Signal,
  Info
} from 'lucide-react';
import { DeviceData } from '@/hooks/useDeviceMap';
import { cn } from '@/lib/utils'; // Impor utilitas cn untuk class yang lebih bersih

interface DeviceInfoPanelProps {
  device: DeviceData | null;
  loading?: boolean;
}

// --- PERUBAHAN: FUNGSI generateSignalBars DENGAN DARK MODE ---
function generateSignalBars(rxPower: number) {
  const bars = 5;
  let activeBars = 0;

  if (rxPower >= -15) activeBars = 5;
  else if (rxPower >= -23) activeBars = 4;
  else if (rxPower >= -24) activeBars = 3;
  else if (rxPower >= -27) activeBars = 2;
  else if (rxPower >= -28) activeBars = 1;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: bars }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-2 w-1 rounded-sm",
            i < activeBars 
              ? 'bg-green-500' 
              : 'bg-gray-300 dark:bg-gray-600' // Perubahan di sini
          )}
          style={{ height: `${(i + 1) * 3 + 2}px` }}
        />
      ))}
    </div>
  );
}

const DeviceInfoPanel = memo(function DeviceInfoPanel({ device, loading }: DeviceInfoPanelProps) {
  if (loading) {
    return (
      <div className="w-full lg:w-80 order-2 lg:order-1 p-4">
        {/* --- PERUBAHAN: CARD LOADING --- */}
        <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-0 shadow-lg h-fit">
          {/* --- PERUBAHAN: CARD HEADER --- */}
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Info className="h-5 w-5" />
              Device Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="w-full lg:w-80 order-2 lg:order-1 p-4">
        <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-0 shadow-lg h-fit">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Info className="h-5 w-5" />
              Device Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {/* --- PERUBAHAN: TEKS DAN IKON KOSONG --- */}
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
              <p>Click a marker on the map to view device details.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { status, info, manufacturer, pppoeUsername, location } = device;
  
  return (
    <div className="w-full lg:w-80 order-2 lg:order-1 p-4">
      <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-0 shadow-lg h-fit">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="h-5 w-5" />
            Device Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {/* Device Header */}
          <div className="mb-6">
            {/* --- PERUBAHAN: JUDUL PERANGKAT --- */}
            <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-2">
              <Router className="h-5 w-5" />
              ONU {manufacturer}
            </h3>
          </div>

          {/* Device Info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium text-gray-500 dark:text-gray-400">
                <Cpu className="h-4 w-4" />
                Model:
              </span>
              <span className="text-gray-700 dark:text-gray-300">{info.modelName}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium text-gray-500 dark:text-gray-400">
                <Settings className="h-4 w-4" />
                Firmware:
              </span>
              <span className="text-gray-700 dark:text-gray-300">{info.softwareVersion}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium text-gray-500 dark:text-gray-400">
                <Scan className="h-4 w-4" />
                Serial Number:
              </span>
              <span className="text-gray-700 dark:text-gray-300 font-mono text-xs">{info.serialNumber}</span>
            </div>
          </div>

          {/* Status Section */}
          {/* --- PERUBAHAN: GARIS PEMISAH --- */}
          <div className="border-t pt-4 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                "w-3 h-3 rounded-full",
                status.isOnline 
                  ? 'bg-green-500 shadow-lg shadow-green-500/50' 
                  : 'bg-red-500 shadow-lg shadow-red-500/50'
              )} />
              <span className="font-medium text-gray-700 dark:text-gray-300">Status:</span>
              {/* --- PERUBAHAN: BADGE STATUS --- */}
              <Badge variant={status.isOnline ? 'default' : 'destructive'}
                  className={cn(
                    status.isOnline ? "bg-green-500 text-white dark:bg-green-600" : "bg-red-500 text-white dark:bg-red-600"
                  )}>
                {status.isOnline ? 'Online' : 'Offline'}
              </Badge>
            </div>

            {status.rxPower && (
              <div className="flex items-center justify-between text-sm mb-3">
                <span className="flex items-center gap-2 font-medium text-gray-500 dark:text-gray-400">
                  <Signal className="h-4 w-4" />
                  Rx Power:
                </span>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "font-medium",
                    status.rxPower < -25 
                      ? 'text-red-600 dark:text-red-400' 
                      : status.rxPower < -20 
                        ? 'text-orange-500 dark:text-orange-400' 
                        : 'text-green-600 dark:text-green-400'
                  )}>
                    {status.rxPower} dBm
                  </span>
                  {generateSignalBars(status.rxPower)}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium text-gray-500 dark:text-gray-400">
                <User className="h-4 w-4" />
                Client Name:
              </span>
              <span className="text-gray-700 dark:text-gray-300">{pppoeUsername}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium text-gray-500 dark:text-gray-400">
                <Clock className="h-4 w-4" />
                Last Inform:
              </span>
              <span className="text-gray-700 dark:text-gray-300 text-xs">{status.lastInform}</span>
            </div>
          </div>

          {/* Location Section */}
          {location.address && (
            <div className="border-t pt-4 dark:border-gray-700">
              {/* --- PERUBAHAN: JUDUL LOKASI --- */}
              <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Device Location
              </h4>
              {/* --- PERUBAHAN: TEKS ALAMAT --- */}
              <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
                {location.address}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

export default DeviceInfoPanel;
