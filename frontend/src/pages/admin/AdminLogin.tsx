import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Router, 
  Lock, 
  User, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Shield,
  Wifi,
  BarChart3,
  Users,
  Settings,
  Ticket,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login, loading, error: authError } = useAdminAuth({ skipInitialCheck: true });
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Use auth error from hook
  React.useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      setError('Please enter both username and password');
      return;
    }

    setError('');

    try {
      await login(formData.username, formData.password);
      toast.success('Login successful!');
      navigate('/admin');
    } catch (error) {
      // Error is handled by the hook
      console.error('❌ Login failed');
    }
  };

  const features = [
    {
      icon: Users,
      title: "Customer Management",
      description: "Manage customer accounts and services",
      color: "bg-blue-500"
    },
    {
      icon: Wifi,
      title: "Network Control",
      description: "GenieACS and Mikrotik management",
      color: "bg-green-500"
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Real-time monitoring and insights",
      color: "bg-purple-500"
    },
    {
      icon: Ticket,
      title: "Voucher System",
      description: "Generate and manage hotspot vouchers",
      color: "bg-orange-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-60 sm:w-80 h-60 sm:h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-60 sm:w-80 h-60 sm:h-80 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 sm:w-96 h-72 sm:h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 w-full max-w-7xl">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8 lg:mb-12">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-2xl">
              <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-xl animate-pulse delay-200">
              <Zap className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent mb-3 sm:mb-4">
            ISP Admin Portal
          </h1>
          <p className="text-lg sm:text-xl text-blue-100 max-w-2xl mx-auto px-4">
            Advanced Network Management & Customer Service Platform
          </p>
          <div className="flex items-center justify-center gap-2 mt-3 sm:mt-4 flex-wrap">
            <Badge variant="secondary" className="bg-blue-500/20 text-blue-200 border-blue-400/30 text-xs sm:text-sm">
              <Shield className="h-3 w-3 mr-1" />
              Secure Access
            </Badge>
            <Badge variant="secondary" className="bg-green-500/20 text-green-200 border-green-400/30 text-xs sm:text-sm">
              <Wifi className="h-3 w-3 mr-1" />
              Real-time Monitoring
            </Badge>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 items-center">
          {/* Features Section */}
          <div className="space-y-4 sm:space-y-6 order-2 lg:order-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card key={index} className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 ${feature.color}/20 rounded-lg flex items-center justify-center`}>
                          <Icon className={`h-5 w-5 sm:h-6 sm:w-6 text-${feature.color.split('-')[1]}-300`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-base sm:text-lg">{feature.title}</h3>
                          <p className="text-xs sm:text-sm text-blue-100 truncate">{feature.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-6 sm:mt-8">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-white">24/7</div>
                <div className="text-xs sm:text-sm text-blue-200">Monitoring</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-white">99.9%</div>
                <div className="text-xs sm:text-sm text-blue-200">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-white">1000+</div>
                <div className="text-xs sm:text-sm text-blue-200">Customers</div>
              </div>
            </div>
          </div>

          {/* Login Form */}
          <div className="order-1 lg:order-2">
            <Card className="bg-white/95 backdrop-blur-md border-white/20 shadow-2xl w-full max-w-md mx-auto">
              <CardHeader className="text-center space-y-3 sm:space-y-4 pb-4 sm:pb-6">
                <div className="flex justify-center">
                  <div className="p-3 sm:p-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl sm:rounded-2xl shadow-lg">
                    <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center justify-center gap-2">
                    Administrator Access
                  </CardTitle>
                  <p className="text-gray-600 mt-2 text-sm sm:text-base">
                    Secure login to ISP management system
                  </p>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                {error && (
                  <Alert variant="destructive" className="animate-in slide-in-from-top-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleLogin} className="space-y-4 sm:space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                      Username
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
                      <Input
                        id="username"
                        name="username"
                        type="text"
                        value={formData.username}
                        onChange={handleInputChange}
                        placeholder="Enter admin username"
                        className="pl-10 sm:pl-12 h-11 sm:h-12 border-2 focus:border-blue-500 transition-colors text-sm sm:text-base"
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="Enter admin password"
                        className="pl-10 sm:pl-12 pr-10 sm:pr-12 h-11 sm:h-12 border-2 focus:border-blue-500 transition-colors text-sm sm:text-base"
                        disabled={loading}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={loading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />
                        ) : (
                          <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 sm:h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white/30 border-t-white"></div>
                        Authenticating...
                      </div>
                    ) : (
                      'Access Dashboard'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 sm:mt-12 text-blue-200">
          <p className="flex items-center justify-center gap-2 text-sm sm:text-base">
            <Router className="h-4 w-4" />
            © 2025 AxeApps - Powered by AxeLink
          </p>
        </div>
      </div>
    </div>
  );
}