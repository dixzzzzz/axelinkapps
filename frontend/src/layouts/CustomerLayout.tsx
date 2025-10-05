import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../hooks/useCustomerAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Home,
  MapPin,
  AlertTriangle,
  Menu,
  X,
  LogOut,
  RefreshCw,
  Wifi
} from 'lucide-react';

interface CustomerLayoutProps {
  children: React.ReactNode;
}

const CustomerLayout: React.FC<CustomerLayoutProps> = ({ children }) => {
  const { user, logout } = useCustomerAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/customer/login');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const navigation = [
    {
      name: 'Dashboard',
      href: '/customer',
      icon: Home,
      current: location.pathname === '/customer' || location.pathname === '/customer/'
    },
    {
      name: 'Device Location',
      href: '/customer/map',
      icon: MapPin,
      current: location.pathname === '/customer/map'
    },
    {
      name: 'Report Issue',
      href: '/customer/trouble',
      icon: AlertTriangle,
      current: location.pathname.startsWith('/customer/trouble')
    },
  ];

  const getStatusBadge = () => {
    // Get connection status from user data or default to online
    const status = user?.connectionStatus || 'online';
    if (status === 'online') {
      return <Badge className="bg-green-100 text-green-800 border-green-300">Online</Badge>;
    } else {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Offline</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between bg-white px-4 py-3 shadow-sm border-b">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </Button>
            <div className="flex items-center gap-2">
              <Wifi className="h-6 w-6 text-blue-600" />
              <span className="font-semibold text-gray-900">Customer Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <Button variant="ghost" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Sidebar for desktop */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? 'lg:w-20' : 'lg:w-72'
      }`}>
        <div className={`flex grow flex-col gap-y-5 overflow-y-auto bg-white pb-4 border-r border-gray-200 transition-all duration-300 ${
          sidebarCollapsed ? 'px-2' : 'px-6'
        }`}>
          <div className="flex h-16 shrink-0 items-center justify-between relative">
            {sidebarCollapsed ? (
              /* Collapsed state */
              <div className="flex items-center justify-center w-full">
                <Wifi className="h-6 w-6 text-blue-600" />
              </div>
            ) : (
              /* Expanded state */
              <div className="flex items-center gap-3">
                <Wifi className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Customer Portal</h1>
                  <p className="text-sm text-gray-500">Device Management</p>
                </div>
              </div>
            )}
            
            {/* Toggle button - always visible in top right */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`hidden lg:flex h-8 w-8 p-0 flex-shrink-0 hover:bg-gray-100/70 absolute right-0 top-1/2 transform -translate-y-1/2 z-10`}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Customer Info Card */}
          {!sidebarCollapsed && (
            <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-blue-700">
                    {user?.phone?.slice(-2) || 'CU'}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{user?.phone || 'Customer'}</p>
                  <div className="flex items-center gap-2">
                    {getStatusBadge()}
                  </div>
                </div>
              </div>
            </Card>
          )}
          
          {/* Collapsed state - show only user avatar */}
          {sidebarCollapsed && (
            <div className="flex justify-center">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-xs font-semibold text-blue-700">
                  {user?.phone?.slice(-2) || 'CU'}
                </span>
              </div>
            </div>
          )}

          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        className={`
                          group flex rounded-md p-3 text-sm leading-6 font-semibold transition-all duration-200
                          ${item.current
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'text-gray-700 hover:text-blue-700 hover:bg-gray-50'
                          }
                          ${sidebarCollapsed ? 'justify-center' : 'gap-x-3'}
                        `}
                        title={sidebarCollapsed ? item.name : undefined}
                      >
                        <item.icon
                          className={`
                            h-5 w-5 shrink-0
                            ${item.current ? 'text-blue-700' : 'text-gray-400 group-hover:text-blue-700'}
                          `}
                          aria-hidden="true"
                        />
                        {!sidebarCollapsed && (
                          <span className="transition-opacity duration-200">
                            {item.name}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
              
              {/* Action Buttons */}
              <li className="mt-auto space-y-2">
                <Button 
                  variant="outline" 
                  className={`w-full transition-all duration-200 ${
                    sidebarCollapsed ? 'justify-center px-2' : 'justify-start'
                  }`}
                  onClick={handleRefresh}
                  title={sidebarCollapsed ? 'Refresh' : undefined}
                >
                  <RefreshCw className="h-4 w-4" />
                  {!sidebarCollapsed && (
                    <span className="ml-2 transition-opacity duration-200">
                      Refresh
                    </span>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  className={`w-full text-red-600 border-red-200 hover:bg-red-50 transition-all duration-200 ${
                    sidebarCollapsed ? 'justify-center px-2' : 'justify-start'
                  }`}
                  onClick={handleLogout}
                  title={sidebarCollapsed ? 'Logout' : undefined}
                >
                  <LogOut className="h-4 w-4" />
                  {!sidebarCollapsed && (
                    <span className="ml-2 transition-opacity duration-200">
                      Logout
                    </span>
                  )}
                </Button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div className={`lg:hidden ${sidebarOpen ? 'relative z-[60]' : ''}`}>
        {/* Backdrop with blur effect */}
        <div 
          className={`fixed inset-0 bg-black/30 backdrop-blur-sm transition-all duration-300 ease-in-out z-[55] ${
            sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`} 
          onClick={() => setSidebarOpen(false)} 
        />
        
        {/* Sidebar panel - modern half-screen design */}
        <div className={`fixed inset-y-0 left-0 z-[60] w-80 max-w-[80vw] overflow-y-auto bg-white/95 backdrop-blur-xl px-6 py-6 shadow-2xl border-r border-gray-200/50 transform transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wifi className="h-6 w-6 text-blue-600" />
                <span className="text-lg font-semibold text-gray-900">Customer Portal</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                className="h-8 w-8 p-0 hover:bg-gray-100/70 transition-colors"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>

              {/* Customer Info Card - Mobile */}
              <Card className="mt-6 p-4 bg-gradient-to-r from-blue-50/80 to-purple-50/80 backdrop-blur-sm border border-blue-200/50 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
                    <span className="text-sm font-bold text-white">
                      {user?.phone?.slice(-2) || 'CU'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{user?.phone || 'Customer'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge()}
                    </div>
                  </div>
                </div>
              </Card>

              <div className="mt-6 flow-root">
                <div className="-my-6 divide-y divide-gray-500/10">
                  <div className="space-y-2 py-6">
                    {navigation.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`
                          group flex items-center gap-x-3 rounded-xl px-4 py-3 text-sm leading-6 font-semibold transition-all duration-200
                          ${item.current
                            ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 shadow-sm border border-blue-200/50'
                            : 'text-gray-700 hover:text-blue-700 hover:bg-gray-50/80 hover:shadow-sm'
                          }
                        `}
                      >
                        <item.icon
                          className={`
                            h-5 w-5 shrink-0 transition-colors
                            ${item.current ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'}
                          `}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    ))}
                  </div>
                  
                  <div className="py-6 space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start rounded-xl border-gray-200/50 hover:bg-gray-50/80 hover:shadow-sm transition-all duration-200" 
                      onClick={() => {
                        handleRefresh();
                        setSidebarOpen(false);
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-3" />
                      Refresh
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start rounded-xl text-red-600 border-red-200/50 hover:bg-red-50/80 hover:shadow-sm transition-all duration-200" 
                      onClick={() => {
                        handleLogout();
                        setSidebarOpen(false);
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Logout
                    </Button>
                  </div>
                </div>
              </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'
      }`}>
        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default CustomerLayout;
