import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Wifi, 
  Zap, 
  Signal,
  Router,
  Smartphone,
  Globe,
  Settings,
  Headphones,
  AlertCircle,
  CheckCircle,
  Clock,
  Edit3
} from 'lucide-react';

export default function CustomerPortal() {
  return (
    <Layout title="My Account">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl p-6 text-white">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2">Welcome back, John!</h1>
          <p className="text-green-100">Manage your internet service and account settings.</p>
          <p className="text-xs text-green-200 mt-2">Customer Portal - localhost:3003/customer/dashboard</p>
        </div>

        {/* Service Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Connection Status</p>
                  <p className="text-2xl font-bold text-green-600">Online</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-green-600 font-medium">99.9%</span>
                <span className="text-muted-foreground ml-1">uptime</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Internet Speed</p>
                  <p className="text-2xl font-bold">50 Mbps</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Zap className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-blue-600 font-medium">Excellent</span>
                <span className="text-muted-foreground ml-1">performance</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data Usage</p>
                  <p className="text-2xl font-bold">245 GB</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Globe className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-purple-600 font-medium">Unlimited</span>
                <span className="text-muted-foreground ml-1">plan</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Signal Strength</p>
                  <p className="text-2xl font-bold">-23 dBm</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Signal className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-green-600 font-medium">Strong</span>
                <span className="text-muted-foreground ml-1">signal</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                WiFi Settings
              </CardTitle>
              <CardDescription>Manage your WiFi network settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wifi-name">WiFi Network Name</Label>
                <div className="flex gap-2">
                  <Input 
                    id="wifi-name" 
                    defaultValue="MyHome_WiFi_5G" 
                    className="flex-1"
                  />
                  <Button size="icon" variant="outline">
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wifi-password">WiFi Password</Label>
                <div className="flex gap-2">
                  <Input 
                    id="wifi-password" 
                    type="password" 
                    defaultValue="mypassword123" 
                    className="flex-1"
                  />
                  <Button size="icon" variant="outline">
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Update WiFi Settings
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Router className="h-5 w-5" />
                Device Status
              </CardTitle>
              <CardDescription>Your connected device information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">ONU Device</p>
                    <p className="text-sm text-muted-foreground">SN: ZTEG12345678</p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  Online
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Device Temperature</span>
                  <span className="font-medium">42°C</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Uptime</span>
                  <span className="font-medium">15 days, 3 hours</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Firmware Version</span>
                  <span className="font-medium">v2.1.4</span>
                </div>
              </div>
              
              <Button variant="outline" className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Device Details
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Support Section */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Headphones className="h-5 w-5" />
              Support & Help
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                <AlertCircle className="h-6 w-6 text-orange-500" />
                <span className="font-medium">Report Issue</span>
                <span className="text-xs text-muted-foreground">Connection problems</span>
              </Button>
              
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                <Smartphone className="h-6 w-6 text-blue-500" />
                <span className="font-medium">WhatsApp Support</span>
                <span className="text-xs text-muted-foreground">Chat with us</span>
              </Button>
              
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                <Clock className="h-6 w-6 text-green-500" />
                <span className="font-medium">Service History</span>
                <span className="text-xs text-muted-foreground">View past tickets</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}