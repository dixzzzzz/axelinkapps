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
import { DeviceData } from '../hooks/useDeviceMap';

interface DeviceInfoPanelProps {
  device: DeviceData | null;
  loading?: boolean;
}

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
          className={`h-2 w-1 rounded-sm ${
            i < activeBars 
              ? 'bg-green-500' 
              : 'bg-gray-300'
          }`}
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
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg h-fit">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
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
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg h-fit">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Info className="h-5 w-5" />
              Device Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center text-gray-500 py-8">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
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
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg h-fit">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="h-5 w-5" />
            Device Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {/* Device Header */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-blue-600 flex items-center gap-2">
              <Router className="h-5 w-5" />
              ONU {manufacturer}
            </h3>
          </div>

          {/* Device Info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium">
                <Cpu className="h-4 w-4 text-gray-500" />
                Model:
              </span>
              <span className="text-gray-700">{info.modelName}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium">
                <Settings className="h-4 w-4 text-gray-500" />
                Firmware:
              </span>
              <span className="text-gray-700">{info.softwareVersion}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium">
                <Scan className="h-4 w-4 text-gray-500" />
                Serial Number:
              </span>
              <span className="text-gray-700 font-mono text-xs">{info.serialNumber}</span>
            </div>
          </div>

          {/* Status Section */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-3 h-3 rounded-full ${
                status.isOnline 
                  ? 'bg-green-500 shadow-lg shadow-green-500/50' 
                  : 'bg-red-500 shadow-lg shadow-red-500/50'
              }`} />
              <span className="font-medium">Status:</span>
              <Badge variant={status.isOnline ? 'default' : 'destructive'}
                  className={status.isOnline ? "bg-green-500 text-white" : "bg-red-500 text-white"}>
                {status.isOnline ? 'Online' : 'Offline'}
              </Badge>
            </div>

            {status.rxPower && (
              <div className="flex items-center justify-between text-sm mb-3">
                <span className="flex items-center gap-2 font-medium">
                  <Signal className="h-4 w-4 text-gray-500" />
                  Rx Power:
                </span>
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${
                    status.rxPower < -25 
                      ? 'text-red-600' 
                      : status.rxPower < -20 
                        ? 'text-orange-500' 
                        : 'text-green-600'
                  }`}>
                    {status.rxPower} dBm
                  </span>
                  {generateSignalBars(status.rxPower)}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium">
                <User className="h-4 w-4 text-gray-500" />
                Client Name:
              </span>
              <span className="text-gray-700">{pppoeUsername}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium">
                <Clock className="h-4 w-4 text-gray-500" />
                Last Inform:
              </span>
              <span className="text-gray-700 text-xs">{status.lastInform}</span>
            </div>
          </div>

          {/* Location Section */}
          {location.address && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-blue-600 mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Device Location
              </h4>
              <p className="text-sm text-gray-700 break-words">
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
