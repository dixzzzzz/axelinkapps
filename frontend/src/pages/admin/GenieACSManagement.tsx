import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Server,
  HardDrive, 
  Wifi, 
  WifiOff, 
  Edit, 
  RotateCcw, 
  MapPin, 
  Search,
  RefreshCw,
  Users,
  Signal,
  Clock,
  Tag,
  Eye,
  EyeOff,
  Save,
  X,
  AlertCircle
} from 'lucide-react';

interface Device {
  id: string;
  serialNumber: string;
  model: string;
  lastInform: string;
  pppoeUsername: string;
  ssid: string;
  ssid2g: string;
  ssid5g: string;
  password: string;
  password2g: string;
  password5g: string;
  userKonek: string;
  rxPower: string;
  tag: string;
  status: 'online' | 'offline';
}

interface EditModalData {
  deviceId: string;
  field: 'ssid2g' | 'ssid5g' | 'password2g' | 'password5g' | 'tag';
  currentValue: string;
  title: string;
}

export default function GenieACSManagement() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [editModal, setEditModal] = useState<EditModalData | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  
  // Auto-dismiss alerts after 5 seconds
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => {
        setAlert(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // Auto-refresh every 2 minutes for real-time monitoring (pause during editing)
  useEffect(() => {
    const interval = setInterval(() => {
      // Pause auto-refresh if user is editing or modal is open
      if (!editModal && !isSubmitting) {
        // console.log('🔄 Auto-refreshing devices data...');
        fetchDevices();
      } else {
        // console.log('⏸️ Auto-refresh paused (editing in progress)');
      }
    }, 2 * 60 * 1000); // 2 minutes

    return () => clearInterval(interval);
  }, [editModal, isSubmitting]);

  // Update last refresh timestamp
  useEffect(() => {
    if (devices.length > 0) {
      setLastRefresh(new Date());
    }
  }, [devices]);

  const fetchDevices = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/admin/genieacs/devices', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // console.log(`✅ Loaded ${data.devices.length} GenieACS devices`);
        setDevices(data.devices);
        setFilteredDevices(data.devices);
        
        // Clear any previous alerts
        setAlert(null);
      } else {
        throw new Error(data.message || 'Failed to load devices');
      }
      
    } catch (error) {
      console.error('❌ Failed to fetch devices:', error);
      setAlert({ 
        type: 'error', 
        message: `Failed to load devices: ${error.message}` 
      });
      
      // Set empty state on error
      setDevices([]);
      setFilteredDevices([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    let filtered = devices;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(device =>
        device.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.pppoeUsername.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.ssid.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(device => device.status === statusFilter);
    }

    setFilteredDevices(filtered);
  }, [devices, searchTerm, statusFilter]);

  const handleEdit = (deviceId: string, field: EditModalData['field'], currentValue: string) => {
    const titles = {
      ssid2g: 'Edit SSID 2.4GHz',
      ssid5g: 'Edit SSID 5GHz',
      password2g: 'Edit Password 2.4GHz',
      password5g: 'Edit Password 5GHz',
      tag: 'Edit Customer Tag'
    };

    setEditModal({
      deviceId,
      field,
      currentValue,
      title: titles[field]
    });
    setEditValue(currentValue);
  };

  const handleSaveEdit = async () => {
    if (!editModal) return;

    // Validation
    if (editModal.field.includes('password') && editValue.length < 8) {
      setAlert({ type: 'error', message: 'Password must be at least 8 characters long' });
      return;
    }
    
    if (!editValue.trim()) {
      setAlert({ type: 'error', message: 'Value cannot be empty' });
      return;
    }

    setIsSubmitting(true);
    try {
      // console.log(`🔧 Updating device ${editModal.deviceId} field ${editModal.field} to: ${editValue}`);
      
      const response = await fetch('/api/admin/genieacs/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          deviceId: editModal.deviceId,
          field: editModal.field,
          value: editValue
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // console.log(`✅ Successfully updated ${editModal.field}`);
        
        // Update local state with new value
        setDevices(prev => prev.map(device => 
          device.id === editModal.deviceId 
            ? { ...device, [editModal.field]: editValue }
            : device
        ));

        setAlert({ 
          type: 'success', 
          message: `${editModal.title} updated successfully` 
        });
        setEditModal(null);
        setEditValue('');
      } else {
        throw new Error(data.message || 'Failed to update device');
      }
      
    } catch (error) {
      console.error('❌ Failed to update device:', error);
      setAlert({ 
        type: 'error', 
        message: `Failed to update device: ${error.message}` 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestart = async (deviceId: string) => {
    if (!confirm('Are you sure you want to restart this device?')) return;

    try {
      // console.log(`🔄 Restarting device: ${deviceId}`);
      
      const response = await fetch('/api/admin/genieacs/restart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          deviceId: deviceId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // console.log(`✅ Restart command sent successfully`);
        setAlert({ 
          type: 'success', 
          message: 'Restart command sent successfully. Device will reboot shortly.' 
        });
      } else {
        throw new Error(data.message || 'Failed to send restart command');
      }
      
    } catch (error) {
      console.error('❌ Failed to restart device:', error);
      setAlert({ 
        type: 'error', 
        message: `Failed to send restart command: ${error.message}` 
      });
    }
  };

  // Fungsi untuk toggle visibilitas password
  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const getStatusBadge = (status: string, lastInform: string) => {
    // Use backend status directly, no need to recalculate
    if (status === 'online') {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Online</Badge>;
    } else {
      return <Badge variant="destructive">Offline</Badge>;
    }
  };

  const getRxPowerColor = (rxPower: string) => {
    if (rxPower === '-' || rxPower === 'N/A') return 'text-gray-500';
    const power = parseFloat(rxPower);
    if (power >= -20) return 'text-green-600';
    if (power >= -25) return 'text-yellow-600';
    return 'text-red-600';
  };

  const stats = {
    total: devices.length,
    online: devices.filter(d => d.status === 'online').length,
    offline: devices.filter(d => d.status === 'offline').length
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Server className="h-8 w-8 text-blue-600" />
            GenieACS Device Management</h1>
          <p className="text-gray-600">Manage ONU/ONT devices and WiFi settings</p>
          {lastRefresh && (
            <p className="text-xs text-gray-400 mt-1">
              Last updated: {lastRefresh.toLocaleString('id-ID')} • Auto-refresh every 2 minutes
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchDevices} disabled={isLoading} variant="outline" size="sm" className="flex items-center gap-2">
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Alert */}
      {alert && (
        <Alert className={alert.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{alert.message}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setAlert(null)}
              className="h-6 w-6 p-0 ml-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 lg:p-6">
            <CardTitle className="text-xs lg:text-sm font-medium">Total Devices</CardTitle>
            <HardDrive className="h-3 w-3 lg:h-4 lg:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
            <div className="text-lg lg:text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 lg:p-6">
            <CardTitle className="text-xs lg:text-sm font-medium">Online</CardTitle>
            <Wifi className="h-3 w-3 lg:h-4 lg:w-4 text-green-600" />
          </CardHeader>
          <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
            <div className="text-lg lg:text-2xl font-bold text-green-600">{stats.online}</div>
          </CardContent>
        </Card>

        <Card className="col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 lg:p-6">
            <CardTitle className="text-xs lg:text-sm font-medium">Offline</CardTitle>
            <WifiOff className="h-3 w-3 lg:h-4 lg:w-4 text-red-600" />
          </CardHeader>
          <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
            <div className="text-lg lg:text-2xl font-bold text-red-600">{stats.offline}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by serial, PPPoE username, tag, or SSID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                All ({devices.length})
              </Button>
              <Button
                variant={statusFilter === 'online' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('online')}
              >
                Online ({stats.online})
              </Button>
              <Button
                variant={statusFilter === 'offline' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('offline')}
              >
                Offline ({stats.offline})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Devices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Devices ({filteredDevices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device Info</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>WiFi 2.4GHz</TableHead>
                  <TableHead>WiFi 5GHz</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Signal</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDevices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{device.serialNumber}</div>
                        <div className="text-sm text-gray-500">{device.model}</div>
                        <div className="text-xs text-gray-400">PPPoE: {device.pppoeUsername}</div>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Tag className="h-3 w-3" />
                          {device.tag}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        {getStatusBadge(device.status, device.lastInform)}
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {device.lastInform}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">SSID:</span>
                          <span className="text-sm">{device.ssid2g}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(device.id, 'ssid2g', device.ssid2g)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Pass:</span>
                          <span className="text-sm">
                            {showPassword[`${device.id}-password2g`] && typeof device.password2g === 'string' ? device.password2g : '••••••••'}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(device.id, 'password2g', device.password2g)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">SSID:</span>
                          <span className="text-sm">{device.ssid5g}</span>
                          {device.ssid5g !== '-' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(device.id, 'ssid5g', device.ssid5g)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Pass:</span>
                          <span className="text-sm">
                            {device.password5g === '-' ? '-' :
                            showPassword[`${device.id}-password5g`] && typeof device.password5g === 'string' ? device.password5g : '••••••••'}
                          </span>
                          {device.password5g !== '-' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(device.id, 'password5g', device.password5g)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium">{device.userKonek}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Signal className="h-4 w-4 text-gray-400" />
                        <span className={`text-sm font-medium ${getRxPowerColor(device.rxPower)}`}>
                          {device.rxPower} dBm
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestart(device.id)}
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(device.id, 'tag', device.tag)}
                        >
                          <Tag className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={!!editModal} onOpenChange={() => setEditModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editModal?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-value">
                {editModal?.field === 'tag' ? 'Customer Phone Number' : 
                 editModal?.field.includes('password') ? 'Password' : 'SSID'}
              </Label>
              <div className="relative">
                <Input
                  id="edit-value"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder={editModal?.field === 'tag' ? 'Enter phone number' : 
                             editModal?.field.includes('password') ? 'Enter password (min 8 characters)' : 'Enter SSID name'}
                  type={editModal?.field.includes('password') ? (showPassword ? 'text' : 'password') : 'text'}
                />
                {editModal?.field.includes('password') && (
                  <div className="absolute right-0 top-0 flex h-full items-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-full px-3"
                      onClick={togglePasswordVisibility}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </div>
              {editModal?.field.includes('password') && (
                <p className="text-xs text-gray-500 mt-1">Password must be at least 8 characters long</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditModal(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}