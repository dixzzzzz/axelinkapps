import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  Router, 
  Users, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Download,
  Upload,
  Gauge,
  MapPin,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  LineChart,
  PieChart
} from 'lucide-react';
import { toast } from 'sonner';

// Dynamic imports for Chart.js to avoid build issues
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

// Types
interface TrafficData {
  rx: number;
  tx: number;
  interface: string;
  timestamp: string;
}

interface NetworkInterface {
  name: string;
  type: string;
  disabled: boolean;
  running: boolean;
}

interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  withLocation: number;
}

interface MikrotikStats {
  total: number;
  active: number;
  inactive: number;
}

interface AnalyticsData {
  deviceStats: DeviceStats;
  mikrotikStats: MikrotikStats;
  trafficHistory: TrafficData[];
  currentTraffic: TrafficData;
  networkStatus: 'idle' | 'low' | 'medium' | 'high' | 'very-high';
}

interface BandwidthFormat {
  value: string;
  unit: string;
}

export default function AnalyticsDashboard() {
  // State
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    deviceStats: { total: 0, online: 0, offline: 0, withLocation: 0 },
    mikrotikStats: { total: 0, active: 0, inactive: 0 },
    trafficHistory: [],
    currentTraffic: { rx: 0, tx: 0, interface: 'ether1-ISP', timestamp: '' },
    networkStatus: 'idle'
  });
  
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [selectedInterface, setSelectedInterface] = useState<string>('ether1-ISP');
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const maxDataPoints = 30;

  // Helper functions
  const toggleAutoRefresh = () => setAutoRefresh(!autoRefresh);

  // Load initial data
  useEffect(() => {
    loadAnalyticsData();
    loadInterfaces();
    
    // Start auto refresh
    if (autoRefresh) {
      startAutoRefresh();
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Handle interface change
  useEffect(() => {
    if (selectedInterface) {
      localStorage.setItem('selectedInterface', selectedInterface);
      // Reset traffic history when interface changes
      setAnalyticsData(prev => ({
        ...prev,
        trafficHistory: [],
        currentTraffic: { ...prev.currentTraffic, interface: selectedInterface }
      }));
      loadTrafficData();
    }
  }, [selectedInterface]);

  // Auto refresh control
  useEffect(() => {
    if (autoRefresh) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
    
    return () => stopAutoRefresh();
  }, [autoRefresh]);

  const startAutoRefresh = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    intervalRef.current = setInterval(() => {
      loadTrafficData();
      loadDashboardStats();
    }, 2000); // Update every 2 seconds
  };

  const stopAutoRefresh = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Load analytics data
  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadDashboardStats(),
        loadTrafficData()
      ]);
    } catch (error) {
      console.error('Error loading analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Load dashboard statistics
  const loadDashboardStats = async () => {
    try {
      const response = await fetch('/api/admin/dashboard', {
        credentials: 'include' // Include session cookies
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setAnalyticsData(prev => ({
          ...prev,
          deviceStats: {
            total: data.stats.genieacs.total || 0,
            online: data.stats.genieacs.online || 0,
            offline: data.stats.genieacs.offline || 0,
            withLocation: data.stats.genieacs.withLocation || 0
          },
          mikrotikStats: {
            total: data.stats.mikrotik.total || 0,
            active: data.stats.mikrotik.active || 0,
            inactive: data.stats.mikrotik.inactive || 0
          }
        }));
        // console.log('✅ Dashboard statistics loaded successfully');
      } else {
        throw new Error(data.message || 'Failed to load dashboard statistics');
      }
    } catch (error) {
      console.error('❌ Error loading dashboard stats:', error);
      toast.error('Failed to load dashboard statistics: ' + error.message);
    }
  };

  // Load traffic data
  const loadTrafficData = async () => {
    try {
      const response = await fetch(`/api/dashboard/traffic?interface=${selectedInterface}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        const now = new Date();
        const newTrafficData: TrafficData = {
          rx: data.rx || 0,
          tx: data.tx || 0,
          interface: data.interface || selectedInterface,
          timestamp: now.toLocaleTimeString('id-ID', { hour12: false })
        };
        
        // Determine network status based on total traffic
        const totalMbps = (newTrafficData.rx + newTrafficData.tx) / 1000000;
        let networkStatus: AnalyticsData['networkStatus'] = 'idle';
        
        if (totalMbps > 100) networkStatus = 'very-high';
        else if (totalMbps > 50) networkStatus = 'high';
        else if (totalMbps > 10) networkStatus = 'medium';
        else if (totalMbps > 1) networkStatus = 'low';
        
        setAnalyticsData(prev => {
          const newHistory = [...prev.trafficHistory];
          
          // Add new data point
          newHistory.push(newTrafficData);
          
          // Keep only last maxDataPoints
          if (newHistory.length > maxDataPoints) {
            newHistory.shift();
          }
          
          return {
            ...prev,
            trafficHistory: newHistory,
            currentTraffic: newTrafficData,
            networkStatus
          };
        });
      } else {
        console.warn('Traffic data request failed:', data.message);
      }
    } catch (error) {
      console.error('❌ Error loading traffic data:', error);
      // Don't show toast for traffic errors to avoid spam during auto-refresh
    }
  };

  // Load available interfaces
  const loadInterfaces = async () => {
    try {
      const response = await fetch('/api/dashboard/interfaces', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.interfaces) {
        setInterfaces(data.interfaces);
        
        // Set default interface if not already set
        const savedInterface = localStorage.getItem('selectedInterface');
        if (savedInterface && data.interfaces.find((iface: NetworkInterface) => iface.name === savedInterface)) {
          setSelectedInterface(savedInterface);
        } else if (data.interfaces.length > 0) {
          setSelectedInterface(data.interfaces[0].name);
        }
        
        // console.log(`✅ Loaded ${data.interfaces.length} network interfaces`);
      } else {
        console.warn('No interfaces data received');
      }
    } catch (error) {
      console.error('❌ Error loading interfaces:', error);
      // Set a default interface if loading fails
      if (interfaces.length === 0) {
        setInterfaces([{ name: 'ether1', type: 'ethernet', disabled: false, running: true }]);
        setSelectedInterface('ether1');
      }
    }
  };

  // Format bandwidth helper
  const formatBandwidth = (bytesPerSecond: number): BandwidthFormat => {
    const bps = bytesPerSecond;
    const kbps = bps / 1000;
    const mbps = bps / 1000000;
    const gbps = bps / 1000000000;
    
    if (gbps >= 1) {
      return { value: gbps.toFixed(3), unit: 'Gbps' };
    } else if (mbps >= 1) {
      return { value: mbps.toFixed(2), unit: 'Mbps' };
    } else if (kbps >= 1) {
      return { value: kbps.toFixed(1), unit: 'Kbps' };
    } else {
      return { value: bps.toFixed(0), unit: 'bps' };
    }
  };

  // Chart configurations
  const trafficChartData = {
    labels: analyticsData.trafficHistory.map(data => data.timestamp),
    datasets: [
      {
        label: 'Download (RX)',
        data: analyticsData.trafficHistory.map(data => data.rx / 1000000), // Convert to Mbps
        fill: true,
        backgroundColor: 'rgba(54, 162, 235, 0.1)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 4
      },
      {
        label: 'Upload (TX)',
        data: analyticsData.trafficHistory.map(data => data.tx / 1000000), // Convert to Mbps
        fill: true,
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 4
      }
    ]
  };

  const trafficChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function(this: any, tooltipItem: any) {
            const label = tooltipItem.dataset.label || '';
            const value = tooltipItem.parsed.y;
            const formatted = formatBandwidth(value * 1000000);
            return `${label}: ${formatted.value} ${formatted.unit}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Bandwidth (Mbps)'
        },
        ticks: {
          callback: function(value: string | number) {
            return `${value} Mbps`;
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Time (Real-time)'
        },
        ticks: {
          maxTicksLimit: 8
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };

  // Device status distribution chart
  const deviceStatusChartData = {
    labels: ['Online', 'Offline'],
    datasets: [{
      data: [analyticsData.deviceStats.online, analyticsData.deviceStats.offline],
      backgroundColor: ['#10b981', '#ef4444'],
      borderColor: ['#059669', '#dc2626'],
      borderWidth: 2
    }]
  };

  const deviceStatusChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: { label: string, parsed: number }) {
            const total = analyticsData.deviceStats.total;
            const value = context.parsed;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            return `${context.label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  // Network status color and text
  const getNetworkStatusInfo = (status: AnalyticsData['networkStatus']) => {
    switch (status) {
      case 'very-high':
        return { color: 'bg-red-500', text: 'Very High', textColor: 'text-red-600' };
      case 'high':
        return { color: 'bg-orange-500', text: 'High', textColor: 'text-orange-600' };
      case 'medium':
        return { color: 'bg-blue-500', text: 'Medium', textColor: 'text-blue-600' };
      case 'low':
        return { color: 'bg-green-500', text: 'Low', textColor: 'text-green-600' };
      default:
        return { color: 'bg-gray-500', text: 'Idle', textColor: 'text-gray-600' };
    }
  };


  const networkStatusInfo = getNetworkStatusInfo(analyticsData.networkStatus);
  const currentRx = formatBandwidth(analyticsData.currentTraffic.rx);
  const currentTx = formatBandwidth(analyticsData.currentTraffic.tx);
  const totalTraffic = formatBandwidth(analyticsData.currentTraffic.rx + analyticsData.currentTraffic.tx);

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            Real-time Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">Network monitoring and device statistics</p>
        </div>
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            onClick={loadAnalyticsData}
            disabled={loading}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            onClick={toggleAutoRefresh}
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            className="flex items-center gap-2"
          >
            <Activity className="h-3 w-3" />
            Auto
          </Button>
        </div>
      </div>

  {/* Current Traffic Status */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs md:text-sm">Download (RX)</p>
                <p className="text-xl md:text-2xl font-bold">{currentRx.value} {currentRx.unit}</p>
              </div>
              <Download className="h-6 w-6 md:h-8 md:w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-xs md:text-sm">Upload (TX)</p>
                <p className="text-xl md:text-2xl font-bold">{currentTx.value} {currentTx.unit}</p>
              </div>
              <Upload className="h-6 w-6 md:h-8 md:w-8 text-red-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs md:text-sm">Total Traffic</p>
                <p className="text-xl md:text-2xl font-bold">{totalTraffic.value} {totalTraffic.unit}</p>
              </div>
              <Gauge className="h-6 w-6 md:h-8 md:w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs md:text-sm">Network Status</p>
                <p className="text-xl md:text-2xl font-bold">{networkStatusInfo.text}</p>
              </div>
              <Activity className="h-6 w-6 md:h-8 md:w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Device Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Total Devices</p>
                <p className="text-xl md:text-2xl font-bold">{analyticsData.deviceStats.total}</p>
              </div>
              <Router className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Online</p>
                <p className="text-xl md:text-2xl font-bold text-green-600">{analyticsData.deviceStats.online}</p>
              </div>
              <CheckCircle className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Offline</p>
                <p className="text-xl md:text-2xl font-bold text-red-600">{analyticsData.deviceStats.offline}</p>
              </div>
              <XCircle className="h-6 w-6 md:h-8 md:w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">With Location</p>
                <p className="text-xl md:text-2xl font-bold text-blue-600">{analyticsData.deviceStats.withLocation}</p>
              </div>
              <MapPin className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Traffic Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Network Traffic - {selectedInterface}
              </CardTitle>
              <Select value={selectedInterface} onValueChange={setSelectedInterface}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select interface" />
                </SelectTrigger>
                <SelectContent>
                  {interfaces.map((iface) => (
                    <SelectItem key={iface.name} value={iface.name}>
                      {iface.name} {!iface.running && '[Down]'} {iface.disabled && '[Disabled]'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <Line data={trafficChartData} options={trafficChartOptions} />
            </div>
          </CardContent>
        </Card>

        {/* Device Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Device Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <Doughnut data={deviceStatusChartData} options={deviceStatusChartOptions} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PPPoE Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">PPPoE Users</p>
                <p className="text-xl md:text-2xl font-bold">{analyticsData.mikrotikStats.total}</p>
              </div>
              <Users className="h-6 w-6 md:h-8 md:w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-xl md:text-2xl font-bold text-green-600">{analyticsData.mikrotikStats.active}</p>
              </div>
              <Wifi className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Inactive</p>
                <p className="text-xl md:text-2xl font-bold text-red-600">{analyticsData.mikrotikStats.inactive}</p>
              </div>
              <WifiOff className="h-6 w-6 md:h-8 md:w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health Indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className={`w-3 h-3 rounded-full ${analyticsData.deviceStats.online > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
              <div>
                <p className="text-sm font-medium">GenieACS Connection</p>
                <p className="text-xs text-muted-foreground">
                  {analyticsData.deviceStats.online > 0 ? 'Connected' : 'Disconnected'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className={`w-3 h-3 rounded-full ${analyticsData.mikrotikStats.active >= 0 ? 'bg-green-500' : 'bg-red-500'}`} />
              <div>
                <p className="text-sm font-medium">Mikrotik Connection</p>
                <p className="text-xs text-muted-foreground">
                  {analyticsData.mikrotikStats.active >= 0 ? 'Connected' : 'Disconnected'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className={`w-3 h-3 rounded-full ${networkStatusInfo.color.replace('bg-', 'bg-')}`} />
              <div>
                <p className="text-sm font-medium">Network Load</p>
                <p className="text-xs text-muted-foreground">{networkStatusInfo.text}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className={`w-3 h-3 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <div>
                <p className="text-sm font-medium">Auto Refresh</p>
                <p className="text-xs text-muted-foreground">
                  {autoRefresh ? 'Active' : 'Paused'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}