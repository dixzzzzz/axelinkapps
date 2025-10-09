import React, { useState, useEffect } from 'react';
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

  Sun,
  Moon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

import logoLight from '/public/assets/logo.png';
import logoDark from '/public/assets/logo.png';

interface CustomerLayoutProps {
  children: React.ReactNode;
}

const CustomerLayout: React.FC<CustomerLayoutProps> = ({ children }) => {
  const { user, logout } = useCustomerAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('customerTheme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('customerTheme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const handleLogout = () => {
    logout();
    navigate('/customer/login');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode);
  };

  const navigation = [
    { name: 'Dashboard', href: '/customer', icon: Home, current: location.pathname === '/customer' || location.pathname === '/customer/' },
    { name: 'Device Location', href: '/customer/map', icon: MapPin, current: location.pathname === '/customer/map' },
    { name: 'Trouble Reports', href: '/customer/reports', icon: AlertTriangle, current: location.pathname.startsWith('/customer/reports') },
  ];

  const getStatusBadge = () => {
    const status = user?.connectionStatus || 'online';
    if (status === 'online') {
      return <Badge className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700">Online</Badge>;
    } else {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700">Offline</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Mobile header */}
      <div className="lg:hidden">
        <div className={cn("flex items-center justify-between px-4 py-3 shadow-sm border-b transition-colors duration-200", isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200")}>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)} className={cn("lg:hidden", isDarkMode ? "text-gray-300 hover:text-white hover:bg-gray-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100")}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="w-32 h-auto flex-shrink-0">
              <img src={isDarkMode ? logoDark : logoLight} alt="Customer Portal Logo" className="w-full h-auto object-contain" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <Button variant="ghost" size="sm" onClick={handleThemeToggle} className={cn("rounded-full p-2", isDarkMode ? "text-yellow-400 hover:bg-gray-700" : "text-gray-600 hover:bg-gray-100")} title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}>
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleRefresh} className={cn(isDarkMode ? "text-gray-300 hover:text-white hover:bg-gray-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100")}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20" title="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Sidebar for desktop */}
      <aside className={cn("hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-all duration-300 ease-in-out", sidebarCollapsed ? "lg:w-16" : "lg:w-64")}>
        <div className={cn("flex grow flex-col gap-y-5 overflow-y-auto pb-4 border-r transition-all duration-300", isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200", sidebarCollapsed ? "px-2" : "px-3")}>
          
          <div className={cn(
            "flex items-center justify-between py-6 px-4 border-b flex-shrink-0 relative",
            isDarkMode ? "border-gray-700" : "border-gray-200"
          )}>
            <div className="flex flex-1 justify-center">
              <div className={cn("flex flex-col items-center gap-1 transition-all duration-300", sidebarCollapsed ? "lg:opacity-0 lg:w-0 lg:overflow-hidden" : "opacity-100")}>
                <div className="w-40 h-auto flex-shrink-0">
                  <img src={isDarkMode ? logoDark : logoLight} alt="Customer Portal Logo" className="w-full h-auto object-contain" />
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={cn("hidden lg:flex h-8 w-8 p-0 flex-shrink-0 hover:bg-gray-100/70 dark:hover:bg-gray-700 absolute right-0 top-1/2 transform -translate-y-1/2 z-10")}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
          
          {/* Customer Info Card */}
          {!sidebarCollapsed && (
            <Card className={cn("p-4 border transition-all duration-300", isDarkMode ? "bg-gray-700/50 border-gray-600" : "bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200")}>
              <div className="flex items-center gap-3">
                <div className={cn("h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0", isDarkMode ? "bg-blue-900/50" : "bg-blue-100")}>
                  <span className={cn("text-sm font-semibold", isDarkMode ? "text-blue-300" : "text-blue-700")}>
                    {user?.phone?.slice(-2) || 'CU'}
                  </span>
                </div>
                <div className="flex-1">
                  <p className={cn("text-sm font-medium", isDarkMode ? "text-gray-200" : "text-gray-900")}>{user?.phone || 'Customer'}</p>
                  <div className="flex items-center gap-2">
                    {getStatusBadge()}
                  </div>
                </div>
              </div>
            </Card>
          )}
          
          {sidebarCollapsed && (
            <div className="flex justify-center">
              <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", isDarkMode ? "bg-blue-900/50" : "bg-blue-100")}>
                <span className={cn("text-xs font-semibold", isDarkMode ? "text-blue-300" : "text-blue-700")}>
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
                      <Link to={item.href} className={cn("group flex rounded-md p-3 text-sm leading-6 font-semibold transition-all duration-200", item.current ? (isDarkMode ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700") : (isDarkMode ? "text-gray-300 hover:text-white hover:bg-gray-700" : "text-gray-700 hover:text-blue-700 hover:bg-gray-50"), sidebarCollapsed ? "justify-center" : "gap-x-3")} title={sidebarCollapsed ? item.name : undefined}>
                        <item.icon className={cn("h-5 w-5 shrink-0", item.current ? "text-blue-700 dark:text-white" : "text-gray-400 group-hover:text-blue-700 dark:group-hover:text-white")} aria-hidden="true" />
                        {!sidebarCollapsed && <span className="transition-opacity duration-200">{item.name}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
              
              {/* Action Buttons */}
              <li className="mt-auto space-y-2">
                <Button variant="outline" className={cn("w-full transition-all duration-200", isDarkMode ? "border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white" : "border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900", sidebarCollapsed ? "justify-center px-2" : "justify-start")} onClick={handleThemeToggle} title={sidebarCollapsed ? 'Toggle Theme' : undefined}>
                  {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {!sidebarCollapsed && <span className="ml-2 transition-opacity duration-200">Theme</span>}
                </Button>

                <Button variant="outline" className={cn("w-full transition-all duration-200", isDarkMode ? "border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white" : "border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900", sidebarCollapsed ? "justify-center px-2" : "justify-start")} onClick={handleRefresh} title={sidebarCollapsed ? 'Refresh' : undefined}>
                  <RefreshCw className="h-4 w-4" />
                  {!sidebarCollapsed && <span className="ml-2 transition-opacity duration-200">Refresh</span>}
                </Button>
                <Button variant="outline" className={cn("w-full text-red-600 border-red-200 hover:bg-red-50 transition-all duration-200 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20", sidebarCollapsed ? "justify-center px-2" : "justify-start")} onClick={handleLogout} title={sidebarCollapsed ? 'Logout' : undefined}>
                  <LogOut className="h-4 w-4" />
                  {!sidebarCollapsed && <span className="ml-2 transition-opacity duration-200">Logout</span>}
                </Button>
              </li>
            </ul>
          </nav>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <div className={`lg:hidden ${sidebarOpen ? 'relative z-[60]' : ''}`}>
        <div className={`fixed inset-0 bg-black/30 backdrop-blur-sm transition-all duration-300 ease-in-out z-[55] ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)} />
        <div className={cn("fixed inset-y-0 left-0 z-[60] w-80 max-w-[80vw] overflow-y-auto backdrop-blur-xl px-6 py-6 shadow-2xl border-r transform transition-all duration-300 ease-in-out", isDarkMode ? "bg-gray-800/95 border-gray-700/50" : "bg-white/95 border-gray-200/50", sidebarOpen ? "translate-x-0" : "-translate-x-full")}>
            <div className="flex items-center justify-between">
              <div className="w-40 h-auto flex-shrink-0">
                <img src={isDarkMode ? logoDark : logoLight} alt="Customer Portal Logo" className="w-full h-auto object-contain" />
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)} className="h-8 w-8 p-0 hover:bg-gray-100/70 dark:hover:bg-gray-700 transition-colors">
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>

              <Card className={cn("mt-6 p-4 border shadow-lg", isDarkMode ? "bg-gray-700/50 border-gray-600" : "bg-gradient-to-r from-blue-50/80 to-purple-50/80 border-blue-200/50")}>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
                    <span className="text-sm font-bold text-white">{user?.phone?.slice(-2) || 'CU'}</span>
                  </div>
                  <div className="flex-1">
                    <p className={cn("text-sm font-semibold", isDarkMode ? "text-gray-200" : "text-gray-900")}>{user?.phone || 'Customer'}</p>
                    <div className="flex items-center gap-2 mt-1">{getStatusBadge()}</div>
                  </div>
                </div>
              </Card>

              <div className="mt-6 flow-root">
                <div className="-my-6 divide-y divide-gray-500/10 dark:divide-gray-700">
                  <div className="space-y-2 py-6">
                    {navigation.map((item) => (
                      <Link key={item.name} to={item.href} onClick={() => setSidebarOpen(false)} className={cn("group flex items-center gap-x-3 rounded-xl px-4 py-3 text-sm leading-6 font-semibold transition-all duration-200", item.current ? (isDarkMode ? "bg-blue-900/30 text-blue-300 shadow-sm border border-blue-800/50" : "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 shadow-sm border border-blue-200/50") : (isDarkMode ? "text-gray-300 hover:text-blue-300 hover:bg-gray-700/50 hover:shadow-sm" : "text-gray-700 hover:text-blue-700 hover:bg-gray-50/80 hover:shadow-sm"))}>
                        <item.icon className={cn("h-5 w-5 shrink-0 transition-colors", item.current ? "text-blue-600 dark:text-blue-400" : "text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400")} aria-hidden="true" />
                        {item.name}
                      </Link>
                    ))}
                  </div>
                  
                  <div className="py-6 space-y-3">
                    <Button variant="outline" className={cn("w-full justify-start rounded-xl border-gray-200/50 hover:bg-gray-50/80 hover:shadow-sm transition-all duration-200 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700")} onClick={() => { handleRefresh(); setSidebarOpen(false); }}>
                      <RefreshCw className="h-4 w-4 mr-3" />
                      Refresh
                    </Button>
                    <Button variant="outline" className={cn("w-full justify-start rounded-xl text-red-600 border-red-200/50 hover:bg-red-50/80 hover:shadow-sm transition-all duration-200 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20")} onClick={() => { handleLogout(); setSidebarOpen(false); }}>
                      <LogOut className="h-4 w-4 mr-3" />
                      Logout
                    </Button>
                  </div>
                </div>
              </div>
        </div>
      </div>

      <div className={`transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        <main className="py-4">
          <div className="px-4 sm:px-4 lg:px-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default CustomerLayout;
