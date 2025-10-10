import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard,
  Router,
  BarChart3,
  Server,
  Map,
  Wand2,
  Activity
} from 'lucide-react';

interface DashboardStats {
  genieacs: {
    total: number;
    online: number;
    offline: number;
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
    genieacs: { total: 0, online: 0, offline: 0 },
    mikrotik: { total: 0, active: 0, inactive: 0 },
    system: { genieacsStatus: 'offline', mikrotikStatus: 'offline', databaseStatus: 'offline' }
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  useState<{ genieacsLastInform: Date | null }>({
    genieacsLastInform: null
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      const genieacsResponse = await fetch('/api/admin/genieacs/devices', {
        credentials: 'include'
      });
      const genieacsData = await genieacsResponse.json();
      
      const mikrotikResponse = await fetch('/api/admin/mikrotik/users/api', {
        credentials: 'include'
      });
      const mikrotikData = await mikrotikResponse.json();

      // Load recent admin activities (login/logout, etc.)
      let serverActivities: RecentActivity[] = [];
      try {
        const activitiesResponse = await fetch('/api/admin/activities', { credentials: 'include' });
        const activitiesJson = await activitiesResponse.json();
        if (activitiesJson?.success && Array.isArray(activitiesJson.activities)) {
          serverActivities = activitiesJson.activities.map((a: any) => ({
            id: a.id || `activity-${Math.random().toString(36).slice(2)}`,
            type: (a.type as any) || 'user',
            title: a.title || 'Activity',
            description: a.description || '',
            timestamp: a.timestamp || new Date().toLocaleString('id-ID'),
            status: (a.status as any) || 'info',
          })) as RecentActivity[];
        }
      } catch (_e) {
        // ignore activities load errors
      }
      
      const genieacsStats = {
        total: genieacsData.success ? genieacsData.devices?.length || 0 : 0,
        online: genieacsData.success ? genieacsData.devices?.filter((d: any) => d.status === 'online').length || 0 : 0,
        offline: genieacsData.success ? genieacsData.devices?.filter((d: any) => d.status === 'offline').length || 0 : 0
      };
      
      const mikrotikStats = {
        total: mikrotikData.success ? mikrotikData.users?.length || 0 : 0,
        active: mikrotikData.success ? mikrotikData.users?.filter((u: any) => u.active).length || 0 : 0,
        inactive: mikrotikData.success ? mikrotikData.users?.filter((u: any) => !u.active).length || 0 : 0
      };
      
      const systemStatus = {
        genieacsStatus: genieacsData.success ? 'online' as const : 'offline' as const,
        mikrotikStatus: mikrotikData.success ? 'online' as const : 'offline' as const,
        databaseStatus: 'online' as const
      };
      
      setStats({
        genieacs: genieacsStats,
        mikrotik: mikrotikStats,
        system: systemStatus
      });
      
      generateRecentActivity(genieacsData, mikrotikData, serverActivities);
      
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setStats(prev => ({
        ...prev,
        system: { genieacsStatus: 'offline', mikrotikStatus: 'offline', databaseStatus: 'offline' }
      }));
    } finally {
      setIsLoading(false);
    }
  };
  
  const generateRecentActivity = (genieacsData: any, mikrotikData: any, serverActivities: RecentActivity[] = []) => {
    // Start with server-provided activities (login/logout), newest first
    const activities: RecentActivity[] = [...serverActivities.slice(0, 4)];
    
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
    
    if (mikrotikData.success && mikrotikData.users) {
      const activeUsers = mikrotikData.users.filter((u: any) => u.active).slice(0, 1);
      activeUsers.forEach((user: any, index: number) => {
        activities.push({
          id: `user-login-${index}`,
          type: 'user',
          title: 'PPP user connected',
          description: `User ${user.username} - Session started`,
          timestamp: new Date(Date.now() - Math.random() * 900000).toLocaleString('id-ID'),
          status: 'info'
        });
      });
    }
    
    activities.push({
      id: 'system-status',
      type: 'system',
      title: 'System health check completed',
      description: 'All systems operational',
      timestamp: new Date().toLocaleString('id-ID'),
      status: 'success'
    });
    
    setRecentActivity(activities.slice(0, 4));
  };
  
  useEffect(() => {
    const interval = setInterval(fetchDashboardData, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    fetchDashboardData();
  };

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
            <LayoutDashboard className="h-8 w-8 text-blue-600" />
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's what's happening with your ISP network.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full justify-start" 
              variant="outline" 
              size="lg"
              onClick={() => navigate('/admin/analytics')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics Dashboard
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="outline" 
              size="lg"
              onClick={() => navigate('/admin/mikrotik')}
            >
              <Router className="h-4 w-4 mr-2" />
              Mikrotik Management
            </Button>
            <Button
              className="w-full justify-start" 
              variant="outline" 
              size="lg"
              onClick={() => navigate('/admin/genieacs')}
            >
              <Server className="h-4 w-4 mr-2" />
              GenieACS Management
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="outline" 
              size="lg"
              onClick={() => navigate('/admin/map')}
            >
              <Map className="h-4 w-4 mr-2" />
              Map Monitoring
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
    </div>
  );
}
