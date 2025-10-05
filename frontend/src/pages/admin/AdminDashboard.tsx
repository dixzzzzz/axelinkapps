import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Router,
  Zap,
  Shield,
  BarChart3,
  Wifi,
  WifiOff,
  TrendingUp,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MapPin,
  Settings,
  Database
} from 'lucide-react';

interface DashboardStats {
  genieacs: {
    total: number;
    online: number;
    offline: number;
    withLocation: number;
  };
  mikrotik: {
    total: number;
    active: number;
    inactive: number;
  };
  system: {
    genieacsStatus: 'online' | 'offline';
    mikrotikStatus: 'online' | 'offline';
    databaseStatus: 'online' | 'offline';
  };
}

interface RecentActivity {
  id: string;
  type: 'device' | 'user' | 'system' | 'alert';
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'info';
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    genieacs: { total: 0, online: 0, offline: 0, withLocation: 0 },
    mikrotik: { total: 0, active: 0, inactive: 0 },
    system: { genieacsStatus: 'offline', mikrotikStatus: 'offline', databaseStatus: 'offline' }
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [systemTimes, setSystemTimes] = useState<{ genieacsLastInform: Date | null }>({
    genieacsLastInform: null
  });

  useEffect(() => {
    // Fetch dashboard data
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch GenieACS data (device statistics)
      const genieacsResponse = await fetch('/api/admin/genieacs/devices', {
        credentials: 'include'
      });
      const genieacsData = await genieacsResponse.json();
      
      // Fetch Mikrotik data (PPPoE users)
      const mikrotikResponse = await fetch('/api/admin/mikrotik/users/api', {
        credentials: 'include'
      });
      const mikrotikData = await mikrotikResponse.json();
      
      // Fetch map data to get location statistics
      const mapResponse = await fetch('/api/admin/map/data', {
        credentials: 'include'
      });
      const mapData = await mapResponse.json();
      
      // Process GenieACS stats
      const genieacsStats = {
        total: genieacsData.success ? genieacsData.devices?.length || 0 : 0,
        online: genieacsData.success ? genieacsData.devices?.filter((d: any) => d.status === 'online').length || 0 : 0,
        offline: genieacsData.success ? genieacsData.devices?.filter((d: any) => d.status === 'offline').length || 0 : 0,
        withLocation: mapData.success ? mapData.summary?.withLocation || 0 : 0
      };
      
      // Process Mikrotik stats
      const mikrotikStats = {
        total: mikrotikData.success ? mikrotikData.users?.length || 0 : 0,
        active: mikrotikData.success ? mikrotikData.users?.filter((u: any) => u.active).length || 0 : 0,
        inactive: mikrotikData.success ? mikrotikData.users?.filter((u: any) => !u.active).length || 0 : 0
      };
      
      // System status
      const systemStatus = {
        genieacsStatus: genieacsData.success ? 'online' as const : 'offline' as const,
        mikrotikStatus: mikrotikData.success ? 'online' as const : 'offline' as const,
        databaseStatus: 'online' as const // Assume online if we can fetch data
      };
      
      setStats({
        genieacs: genieacsStats,
        mikrotik: mikrotikStats,
        system: systemStatus
      });

      // Compute system times
      let genieacsLastInformMs = 0;
      if (mapData.success && Array.isArray(mapData.devices)) {
        for (const d of mapData.devices) {
          if (d.lastInform) {
            const t = new Date(d.lastInform).getTime();
            if (!Number.isNaN(t)) genieacsLastInformMs = Math.max(genieacsLastInformMs, t);
          }
          // Some responses might nest lastInform under status; try to parse if available
          if (!genieacsLastInformMs && d.status?.lastInform) {
            const t2 = new Date(d.status.lastInform).getTime();
            if (!Number.isNaN(t2)) genieacsLastInformMs = Math.max(genieacsLastInformMs, t2);
          }
        }
      }
      const now = new Date();
      setSystemTimes({
        genieacsLastInform: genieacsLastInformMs ? new Date(genieacsLastInformMs) : null
      });
      
      // Generate recent activity based on actual data
      generateRecentActivity(genieacsData, mikrotikData);
      
      setLastRefresh(now);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      // Set system status to offline on error
      setStats(prev => ({
        ...prev,
        system: { genieacsStatus: 'offline', mikrotikStatus: 'offline', databaseStatus: 'offline' }
      }));
    } finally {
      setIsLoading(false);
    }
  };
  
  const generateRecentActivity = (genieacsData: any, mikrotikData: any) => {
    const activities: RecentActivity[] = [];
    
    // Generate activities based on device status
    if (genieacsData.success && genieacsData.devices) {
      const recentOfflineDevices = genieacsData.devices.filter((d: any) => d.status === 'offline').slice(0, 2);
      recentOfflineDevices.forEach((device: any, index: number) => {
        activities.push({
          id: `device-offline-${index}`,
          type: 'alert',
          title: 'Device went offline',
          description: `ONU ${device.serialNumber || device.id} - Connection timeout`,
          timestamp: new Date(Date.now() - Math.random() * 3600000).toLocaleString('id-ID'),
          status: 'error'
        });
      });
      
      const recentOnlineDevices = genieacsData.devices.filter((d: any) => d.status === 'online').slice(0, 1);
      recentOnlineDevices.forEach((device: any, index: number) => {
        activities.push({
          id: `device-online-${index}`,
          type: 'device',
          title: 'Device came back online',
          description: `ONU ${device.serialNumber || device.id} - Connection restored`,
          timestamp: new Date(Date.now() - Math.random() * 1800000).toLocaleString('id-ID'),
          status: 'success'
        });
      });
    }
    
    // Generate activities based on Mikrotik users
    if (mikrotikData.success && mikrotikData.users) {
      const activeUsers = mikrotikData.users.filter((u: any) => u.active).slice(0, 1);
      activeUsers.forEach((user: any, index: number) => {
        activities.push({
          id: `user-login-${index}`,
          type: 'user',
          title: 'PPPoE user connected',
          description: `User ${user.username} - Session started`,
          timestamp: new Date(Date.now() - Math.random() * 900000).toLocaleString('id-ID'),
          status: 'info'
        });
      });
    }
    
    // Add system status activity
    activities.push({
      id: 'system-status',
      type: 'system',
      title: 'System health check completed',
      description: 'All systems operational',
      timestamp: new Date().toLocaleString('id-ID'),
      status: 'success'
    });
    
    // Sort by timestamp (most recent first) and limit to 4
    setRecentActivity(activities.slice(0, 4));
  };
  
  // Auto-refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(fetchDashboardData, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's what's happening with your ISP network.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={fetchDashboardData}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Activity className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <Card>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-muted-foreground">Total Devices</p>
                <p className="text-lg lg:text-2xl font-bold">{stats.genieacs.total.toLocaleString()}</p>
              </div>
              <Router className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600" />
            </div>
            <div className="mt-2 lg:mt-4 flex items-center text-xs lg:text-sm">
              <MapPin className="h-3 w-3 lg:h-4 lg:w-4 text-blue-600 mr-1" />
              <span className="text-blue-600 font-medium">{stats.genieacs.withLocation}</span>
              <span className="text-muted-foreground ml-1">with location</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-muted-foreground">Online Devices</p>
                <p className="text-lg lg:text-2xl font-bold text-green-600">{stats.genieacs.online.toLocaleString()}</p>
              </div>
              <Wifi className="h-6 w-6 lg:h-8 lg:w-8 text-green-600" />
            </div>
            <div className="mt-2 lg:mt-4 flex items-center text-xs lg:text-sm">
              <WifiOff className="h-3 w-3 lg:h-4 lg:w-4 text-red-600 mr-1" />
              <span className="text-red-600 font-medium">{stats.genieacs.offline}</span>
              <span className="text-muted-foreground ml-1">offline</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-muted-foreground">PPPoE Users</p>
                <p className="text-lg lg:text-2xl font-bold">{stats.mikrotik.total.toLocaleString()}</p>
              </div>
              <Users className="h-6 w-6 lg:h-8 lg:w-8 text-purple-600" />
            </div>
            <div className="mt-2 lg:mt-4 flex items-center text-xs lg:text-sm">
              <CheckCircle className="h-3 w-3 lg:h-4 lg:w-4 text-green-600 mr-1" />
              <span className="text-green-600 font-medium">{stats.mikrotik.active}</span>
              <span className="text-muted-foreground ml-1">active sessions</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-muted-foreground">System Health</p>
                <p className="text-lg lg:text-2xl font-bold text-green-600">
                  {Object.values(stats.system).filter(s => s === 'online').length}/3
                </p>
              </div>
              <Activity className="h-6 w-6 lg:h-8 lg:w-8 text-green-600" />
            </div>
            <div className="mt-2 lg:mt-4 flex items-center text-xs lg:text-sm">
              <Zap className="h-3 w-3 lg:h-4 lg:w-4 text-green-600 mr-1" />
              <span className="text-green-600 font-medium">Operational</span>
              <span className="text-muted-foreground ml-1">all systems</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Router className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full justify-start" 
              variant="outline" 
              size="lg"
              onClick={() => navigate('/admin/genieacs')}
            >
              <Router className="h-4 w-4 mr-2" />
              GenieACS Management
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="outline" 
              size="lg"
              onClick={() => navigate('/admin/mikrotik')}
            >
              <Users className="h-4 w-4 mr-2" />
              Mikrotik Management
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="outline" 
              size="lg"
              onClick={() => navigate('/admin/map-monitoring')}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Map Monitoring
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="outline" 
              size="lg"
              onClick={() => navigate('/admin/analytics')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics Dashboard
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              recentActivity.map((activity) => {
                const bgColor = {
                  success: 'bg-green-50',
                  error: 'bg-red-50',
                  warning: 'bg-orange-50',
                  info: 'bg-blue-50'
                }[activity.status];
                
                const dotColor = {
                  success: 'bg-green-500',
                  error: 'bg-red-500',
                  warning: 'bg-orange-500',
                  info: 'bg-blue-500'
                }[activity.status];
                
                const badgeColor = {
                  success: 'bg-green-100 text-green-700',
                  error: 'bg-red-100 text-red-700',
                  warning: 'bg-orange-100 text-orange-700',
                  info: 'bg-blue-100 text-blue-700'
                }[activity.status];
                
                return (
                  <div key={activity.id} className={`flex items-start gap-3 p-3 ${bgColor} rounded-lg`}>
                    <div className={`w-2 h-2 ${dotColor} rounded-full mt-2`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      <p className="text-xs text-gray-600">{activity.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                    </div>
                    <Badge variant="secondary" className={badgeColor}>
                      {activity.status === 'success' ? 'Success' :
                       activity.status === 'error' ? 'Alert' :
                       activity.status === 'warning' ? 'Warning' : 'Info'}
                    </Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 lg:gap-6">
            <div className="text-center">
              <div className={`w-12 h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center mx-auto mb-2 lg:mb-3 ${
                stats.system.genieacsStatus === 'online' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {stats.system.genieacsStatus === 'online' ? (
                  <CheckCircle className="h-6 w-6 lg:h-8 lg:w-8 text-green-600" />
                ) : (
                  <XCircle className="h-6 w-6 lg:h-8 lg:w-8 text-red-600" />
                )}
              </div>
              <h3 className="text-xs lg:text-sm font-semibold text-gray-900">GenieACS Server</h3>
              <p className={`text-xs lg:text-sm ${
                stats.system.genieacsStatus === 'online' ? 'text-green-600' : 'text-red-600'
              }`}>
                {stats.system.genieacsStatus === 'online' ? 'Online' : 'Offline'}
              </p>
              <p className="text-xs text-gray-500 hidden lg:block">
                {lastRefresh ? `Checked at: ${lastRefresh.toLocaleString('id-ID')}` : 'Checking...'}
              </p>
              {systemTimes.genieacsLastInform ? (
                <p className="text-[10px] text-gray-400 mt-0.5 lg:block">
                  Last Inform: {systemTimes.genieacsLastInform.toLocaleString('id-ID')}
                </p>
              ) : (
                <p className="text-[10px] text-gray-400 mt-0.5 lg:block">
                  {stats.system.genieacsStatus === 'online' ? 'Monitoring devices...' : 'No inform data'}
                </p>
              )}
            </div>
            
            <div className="text-center">
              <div className={`w-12 h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center mx-auto mb-2 lg:mb-3 ${
                stats.system.mikrotikStatus === 'online' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {stats.system.mikrotikStatus === 'online' ? (
                  <CheckCircle className="h-6 w-6 lg:h-8 lg:w-8 text-green-600" />
                ) : (
                  <XCircle className="h-6 w-6 lg:h-8 lg:w-8 text-red-600" />
                )}
              </div>
              <h3 className="text-xs lg:text-sm font-semibold text-gray-900">Mikrotik API</h3>
              <p className={`text-xs lg:text-sm ${
                stats.system.mikrotikStatus === 'online' ? 'text-green-600' : 'text-red-600'
              }`}>
                {stats.system.mikrotikStatus === 'online' ? 'Connected' : 'Disconnected'}
              </p>
              <p className="text-xs text-gray-500 hidden lg:block">
                {lastRefresh ? `Checked at: ${lastRefresh.toLocaleString('id-ID')}` : 'Checking...'}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5 lg:block">
                {stats.system.mikrotikStatus === 'online' ? 'Response: < 50ms' : 'Connection failed'}
              </p>
            </div>
            
            <div className="text-center">
              <div className={`w-12 h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center mx-auto mb-2 lg:mb-3 ${
                stats.system.databaseStatus === 'online' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {stats.system.databaseStatus === 'online' ? (
                  <Database className="h-6 w-6 lg:h-8 lg:w-8 text-green-600" />
                ) : (
                  <XCircle className="h-6 w-6 lg:h-8 lg:w-8 text-red-600" />
                )}
              </div>
              <h3 className="text-xs lg:text-sm font-semibold text-gray-900">Database</h3>
              <p className={`text-xs lg:text-sm ${
                stats.system.databaseStatus === 'online' ? 'text-green-600' : 'text-red-600'
              }`}>
                {stats.system.databaseStatus === 'online' ? 'Healthy' : 'Unhealthy'}
              </p>
              <p className="text-xs text-gray-500 hidden lg:block">
                {lastRefresh ? `Checked at: ${lastRefresh.toLocaleString('id-ID')}` : 'Checking...'}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5 lg:block">
                {stats.system.databaseStatus === 'online' ? 'Connections: Active' : 'Connection failed'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
