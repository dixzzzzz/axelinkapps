import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users,
  Smartphone,
  Globe,
  Wifi,
  Activity,
  CheckCircle,
  XCircle,
  WifiOff,
  AlertTriangle
} from 'lucide-react';

interface ConnectedUser {
  hostname: string;
  ip: string;
  mac: string;
  iface: string;
  leaseTime?: string;
  waktu: string;
}

interface DeviceTableProps {
  connectedUsers: ConnectedUser[];
  title?: string;
  className?: string;
}

const DeviceTable: React.FC<DeviceTableProps> = ({ 
  connectedUsers, 
  title = 'Connected Users',
  className = ''
}) => {
  const getInterfaceBadge = (iface: string) => {
    if (iface.includes('2.4')) {
      return (
        <Badge className="bg-orange-100 text-orange-800 border-orange-300">
          <Wifi className="w-3 h-3 mr-1" />
          2.4GHz
        </Badge>
      );
    } else if (iface.includes('5')) {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-300">
          <Wifi className="w-3 h-3 mr-1" />
          5GHz
        </Badge>
      );
    } else if (iface.includes('Ethernet')) {
      return (
        <Badge className="bg-purple-100 text-purple-800 border-purple-300">
          <Wifi className="w-3 h-3 mr-1" />
          Ethernet
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-gray-100 text-gray-800 border-gray-300">
          <WifiOff className="w-3 h-3 mr-1" />
          {iface}
        </Badge>
      );
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Active') {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-300">
          <CheckCircle className="w-3 h-3 mr-1" />
          Active
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-300">
          <XCircle className="w-3 h-3 mr-1" />
          Not Active
        </Badge>
      );
    }
  };

  return (
    <Card className={className}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5" />
            {title}
          </h2>
          {connectedUsers.length > 0 && (
            <div className="text-xs text-gray-500 sm:hidden">
              <span className="flex items-center gap-1">
                ← → Swipe to scroll
              </span>
            </div>
          )}
        </div>
        
        {connectedUsers.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
            <table className="w-full min-w-[650px] table-auto bg-white">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Smartphone className="w-4 h-4" />
                      <span>Device</span>
                    </div>
                  </th>
                  <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Globe className="w-4 h-4" />
                      <span>IP</span>
                    </div>
                  </th>
                  <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Wifi className="w-4 h-4" />
                      <span>MAC</span>
                    </div>
                  </th>
                  <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Wifi className="w-4 h-4" />
                      <span>Interface</span>
                    </div>
                  </th>
                  <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Activity className="w-4 h-4" />
                      <span>Status</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {connectedUsers.map((user, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-2 sm:px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        {user.hostname !== '-' ? (
                          <Smartphone className="w-4 h-4 text-blue-500 mr-2" />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-400 mr-2" />
                        )}
                        <span className="text-xs sm:text-sm font-medium text-gray-900 truncate max-w-20 sm:max-w-none">
                          {user.hostname}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 py-3 whitespace-nowrap">
                      <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs">
                        {user.ip}
                      </Badge>
                    </td>
                    <td className="px-2 sm:px-4 py-3 whitespace-nowrap">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                        {user.mac}
                      </code>
                    </td>
                    <td className="px-2 sm:px-4 py-3 whitespace-nowrap">
                      {getInterfaceBadge(user.iface)}
                    </td>
                    <td className="px-2 sm:px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(user.waktu)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              No devices are currently connected.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default DeviceTable;
