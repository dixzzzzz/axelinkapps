import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../../hooks/useCustomerAuth';
import { useCustomerDashboard } from '../../hooks/useCustomerDashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  showSSIDSuccessPopup, 
  showPasswordSuccessPopup, 
  showRestartSuccessPopup, 
  showErrorPopup, 
  showWarningPopup, 
  showValidationPopup 
} from '../../utils/sweetAlert';
import { 
  Wifi, 
  Cpu, 
  Thermometer, 
  Activity, 
  Globe, 
  User, 
  Users, 
  Clock, 
  Power, 
  AlertTriangle, 
  Smartphone,
  CheckCircle,
  XCircle,
  WifiOff,
  Shield,
  RefreshCw,
  MapPin
} from 'lucide-react';
import StatCard from '../../components/customer/StatCard';
import DeviceTable from '../../components/customer/DeviceTable';
import { useActionFlow } from '@/hooks/useActionFlow';

interface CustomerData {
  phone: string;
  email?: string;
  name: string;
  isFirstLogin?: boolean;
  deviceData?: {
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
  };
  status?: 'active' | 'inactive' | 'suspended';
  connectionStatus?: 'online' | 'offline';
}

interface ConnectedUser {
  hostname: string;
  ip: string;
  iface: string;
  leaseTime?: string;
  waktu: string;
}


const CustomerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useCustomerAuth();
  const { data: customerData, loading, error, refreshData, restartDevice, changeSSID, changePassword } = useCustomerDashboard();
  const [restartDialog, setRestartDialog] = useState(false);
  const [ssid2g, setSsid2g] = useState('');
  const [ssid5g, setSsid5g] = useState('');
  const [password2g, setPassword2g] = useState('');
  const [password5g, setPassword5g] = useState('');
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const restartFlow = useActionFlow<{ success: boolean; message: string }>();
  const ssidFlow = useActionFlow<{ success: boolean; message: string }>();
  const passwordFlow = useActionFlow<{ success: boolean; message: string }>();

  const isRestartProcessing = restartFlow.state.phase === 'requesting' || restartFlow.state.phase === 'processing';
  const isSsidProcessing = ssidFlow.state.phase === 'requesting' || ssidFlow.state.phase === 'processing';
  const isPasswordProcessing = passwordFlow.state.phase === 'requesting' || passwordFlow.state.phase === 'processing';

  // Data is now loaded by useCustomerDashboard hook

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleRestartDevice = async () => {
    try {
      const result = await restartFlow.start(
        async () => await restartDevice(),
        { minRequestMs: 700, minProcessingMs: 1200, processingLabel: 'Sending WhatsApp status...' }
      );
      
      if (result.success) {
        setRestartDialog(false);
        await showRestartSuccessPopup(result.message);
      } else {
        await showErrorPopup('Restart Failed', result.message);
      }
    } catch (error) {
      await showErrorPopup(
        'Connection Error', 
        'Failed to restart device. Please check your connection and try again.'
      );
    }
  };

  const handleChangeSSID = async (type: '2g' | '5g') => {
    const ssid = type === '2g' ? ssid2g : ssid5g;
    if (!ssid.trim()) {
      await showValidationPopup('Invalid Input', 'Please enter a valid SSID name.');
      return;
    }

    try {
      const result = await ssidFlow.start(
        async () => await changeSSID(type, ssid),
        { minRequestMs: 700, minProcessingMs: 1200, processingLabel: 'Sending WhatsApp status...' }
      );
      
      if (result.success) {
        if (type === '2g') setSsid2g('');
        else setSsid5g('');
        await showSSIDSuccessPopup(type, ssid, result.message);
      } else {
        await showErrorPopup('SSID Update Failed', result.message);
      }
    } catch (error) {
      await showErrorPopup(
        'Connection Error', 
        `Failed to change SSID ${type.toUpperCase()}. Please check your connection and try again.`
      );
    }
  };

  const handleChangePassword = async (type: '2g' | '5g') => {
    const password = type === '2g' ? password2g : password5g;
    if (!password.trim()) {
      await showValidationPopup('Invalid Input', 'Please enter a valid password.');
      return;
    }

    try {
      const result = await passwordFlow.start(
        async () => await changePassword(type, password),
        { minRequestMs: 700, minProcessingMs: 1200, processingLabel: 'Sending WhatsApp status...' }
      );
      
      if (result.success) {
        if (type === '2g') setPassword2g('');
        else setPassword5g('');
        await showPasswordSuccessPopup(type, password, result.message);
      } else {
        await showErrorPopup('Password Update Failed', result.message);
      }
    } catch (error) {
      await showErrorPopup(
        'Connection Error', 
        `Failed to change password ${type.toUpperCase()}. Please check your connection and try again.`
      );
    }
  };

  const handleReportIssue = () => {
    navigate('/customer/trouble');
  };

  const handleDeviceLocation = () => {
    navigate('/customer/map');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert className="border-red-300 bg-red-50">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription className="text-red-800">
            Failed to load dashboard data: {error}
          </AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button onClick={refreshData} className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const deviceData = customerData?.deviceData || {};
  const connectedUsers = Array.isArray(deviceData.connectedUsers) 
    ? deviceData.connectedUsers.map(user => ({
        hostname: String(user.hostname || '').toString(),
        ip: String(user.ip || '').toString(), 
        mac: String(user.mac || '').toString(),
        iface: String(user.iface || '').toString(),
        leaseTime: user.leaseTime ? String(user.leaseTime).toString() : undefined,
        waktu: String(user.waktu || '').toString()
      }))
    : [];
  
  const getStatusBadge = (status?: string) => {
    if (status === 'Online') {
      return <Badge className="bg-green-100 text-green-800 border-green-300"><CheckCircle className="w-3 h-3 mr-1" />Online</Badge>;
    } else if (status === 'Offline') {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300"><Clock className="w-3 h-3 mr-1" />Offline</Badge>;
    } else {
      return <Badge className="bg-gray-100 text-gray-800 border-gray-300"><XCircle className="w-3 h-3 mr-1" />{status || 'Unknown'}</Badge>;
    }
  };


  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <Alert className={`mb-6 ${notification.type === 'success' ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
          <AlertDescription className={notification.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {notification.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Welcome Header */}
      <Card className="mb-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <User className="w-8 h-8" />
            <div>
              <h1 className="text-xl md:text-2xl font-bold">
                Hello, {customerData?.phone}
              </h1>
              <p className="text-blue-100">Welcome to your device dashboard</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid - Mobile First: 2 columns, Desktop: 5 columns */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <StatCard
          icon={<Wifi className="w-5 h-5 text-blue-600" />}
          label="Device Status"
          value={getStatusBadge(deviceData.status)}
          status={deviceData.status === 'Online' ? 'online' : 'offline'}
        />
        <StatCard
          icon={<Cpu className="w-5 h-5 text-purple-600" />}
          label="Device Type"
          value={String(deviceData.Manufacturer || 'Unknown')}
        />
        <StatCard
          icon={<Thermometer className="w-5 h-5 text-red-600" />}
          label="Temperature"
          value={`${String(deviceData.temperature || 'N/A')} °C`}
        />
        <StatCard
          icon={<Activity className="w-5 h-5 text-green-600" />}
          label="RX Power"
          value={String(deviceData.rxPower || 'N/A')}
        />
        <StatCard
          icon={<Globe className="w-5 h-5 text-indigo-600" />}
          label="IP Address"
          value={String(deviceData.pppoeIP || 'N/A')}
        />
        <StatCard
          icon={<User className="w-5 h-5 text-gray-600" />}
          label="Username"
          value={String(deviceData.pppoeUsername || 'N/A')}
        />
        <StatCard
          icon={<Wifi className="w-5 h-5 text-blue-600" />}
          label="SSID 2G"
          value={String(deviceData.ssid2g || deviceData.ssid || 'N/A')}
        />
        <StatCard
          icon={<Wifi className="w-5 h-5 text-cyan-600" />}
          label="SSID 5G"
          value={String(deviceData.ssid5g || (deviceData.ssid ? `${deviceData.ssid}-5G` : 'N/A'))}
        />
        <StatCard
          icon={<Users className="w-5 h-5 text-orange-600" />}
          label="Connected"
          value={String(deviceData.totalAssociations || connectedUsers.length || 0)}
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-teal-600" />}
          label="Last Inform"
          value={String(deviceData.lastInform || 'Never')}
        />
      </div>

      {/* WiFi Management Section */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Wifi className="w-5 h-5" />
            WiFi Management
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* WiFi 2G */}
            <Card className="border-blue-200">
              <CardContent className="p-4">
                <h3 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
                  <Wifi className="w-4 h-4" />
                  WiFi 2G
                </h3>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="New SSID 2G"
                      value={ssid2g}
                      onChange={(e) => setSsid2g(e.target.value)}
                      maxLength={32}
                      className="flex-1"
                    />
                    <Button 
                      onClick={() => handleChangeSSID('2g')}
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={isSsidProcessing}
                    >
                      {isSsidProcessing ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="New Password 2G"
                      type="password"
                      value={password2g}
                      onChange={(e) => setPassword2g(e.target.value)}
                      maxLength={32}
                      className="flex-1"
                    />
                    <Button 
                      onClick={() => handleChangePassword('2g')}
                      className="bg-purple-600 hover:bg-purple-700"
                      disabled={isPasswordProcessing}
                    >
                      {isPasswordProcessing ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Shield className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* WiFi 5G */}
            <Card className="border-green-200">
              <CardContent className="p-4">
                <h3 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                  <Wifi className="w-4 h-4" />
                  WiFi 5G
                </h3>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="New SSID 5G"
                      value={ssid5g}
                      onChange={(e) => setSsid5g(e.target.value)}
                      maxLength={32}
                      className="flex-1"
                    />
                    <Button 
                      onClick={() => handleChangeSSID('5g')}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={isSsidProcessing}
                    >
                      {isSsidProcessing ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="New Password 5G"
                      type="password"
                      value={password5g}
                      onChange={(e) => setPassword5g(e.target.value)}
                      maxLength={32}
                      className="flex-1"
                    />
                    <Button 
                      onClick={() => handleChangePassword('5g')}
                      className="bg-purple-600 hover:bg-purple-700"
                      disabled={isPasswordProcessing}
                    >
                      {isPasswordProcessing ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Shield className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Quick Actions
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-r from-green-500 to-teal-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <MapPin className="w-6 h-6" />
                  <h3 className="font-semibold">Device Location</h3>
                </div>
                <p className="text-sm text-green-100 mb-4">
                  View your device location on the map
                </p>
                <div className="space-y-2">
                  <Button 
                    onClick={handleDeviceLocation}
                    className="w-full bg-white text-green-600 hover:bg-gray-100"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    View Location
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Power className="w-6 h-6" />
                  <h3 className="font-semibold">Restart Device</h3>
                </div>
                <p className="text-sm text-blue-100 mb-4">
                  Restart the device to resolve connection issues
                </p>
                <Dialog open={restartDialog} onOpenChange={setRestartDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-white text-blue-600 hover:bg-gray-100">
                      <Power className="w-4 h-4 mr-2" />
                      Restart Now
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirm Device Restart</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to restart your device? This will temporarily interrupt your internet connection.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setRestartDialog(false)}>
                        Cancel
                      </Button>
                      <Button 
                        className="bg-red-600 hover:bg-red-700" 
                        onClick={handleRestartDevice}
                        disabled={isRestartProcessing}
                      >
                        {isRestartProcessing ? (
                          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        {isRestartProcessing ? 'Restarting...' : 'Yes, Restart'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <AlertTriangle className="w-6 h-6" />
                  <h3 className="font-semibold">Report Issue</h3>
                </div>
                <p className="text-sm text-yellow-100 mb-4">
                  Report a connectivity problem or service fault
                </p>
                <div className="space-y-2">
                  <Button 
                    onClick={handleReportIssue}
                    className="w-full bg-white text-orange-600 hover:bg-gray-100"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Create Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Connected Users Table */}
      <DeviceTable connectedUsers={connectedUsers} />

      {/* Contact Support */}
      <Alert className="mt-6 border-blue-200 bg-blue-50">
        <AlertDescription className="text-blue-800">
          If you experience any issues, please contact the Developer via WhatsApp:
          <a 
            href={`https://wa.me/6281911290961`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="ml-2 inline-flex items-center text-sm text-green-600 hover:text-green-700 hover:underline transition-colors"
          >
          <svg 
            xmlns="http://www.w3.org/2000/svg"
            className="w-3.5 h-3.5 align-text-bottom"
            viewBox="0 0 16 16"
            fill="currentColor"
          > 
            <path 
              d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
          </svg>
            <span className="ml-1 font-semibold">+62 819 1129 0961</span>
          </a>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default CustomerDashboard;
