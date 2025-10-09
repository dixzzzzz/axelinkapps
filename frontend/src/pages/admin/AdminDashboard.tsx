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
  const [isLoading, setIsLoading] = useState(false);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  useEffect(() => {
    // Initialize with static recent activity
    initializeRecentActivity();
  }, []);

  const initializeRecentActivity = () => {
    // Static recent activities
    const activities: RecentActivity[] = [
      {
        id: 'welcome',
        type: 'system',
        title: 'Welcome to Admin Dashboard',
        description: 'System initialized successfully',
        timestamp: new Date().toLocaleString('id-ID'),
        status: 'success'
      }
    ];
    
    setRecentActivity(activities);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    // Simulate refresh
    setTimeout(() => {
      setIsLoading(false);
      // Add refresh activity
      const newActivity: RecentActivity = {
        id: `refresh-${Date.now()}`,
        type: 'system',
        title: 'Dashboard Refreshed',
        description: 'Manual refresh completed',
        timestamp: new Date().toLocaleString('id-ID'),
        status: 'info'
      };
      
      setRecentActivity(prev => [newActivity, ...prev].slice(0, 4));
    }, 1000);
  };

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
