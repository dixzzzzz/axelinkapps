import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  LayoutDashboard, 
  BarChart3, 
  Server, 
  Ticket, 
  Map, 
  AlertTriangle, 
  Router, 
  Building,
  Menu, 
  X, 
  Bell, 
  Settings, 
  User, 
  Sun, 
  Moon,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import logoLight from '/assets/logo.png';
import logoDark from '/assets/logo.png';

interface AdminLayoutProps {
  children: React.ReactNode;
}
const menuItems = [
  { title: 'Dashboard', href: '/admin', icon: LayoutDashboard, description: 'Overview sistem' },
  { title: 'Analytics', href: '/admin/analytics', icon: BarChart3, description: 'Data Analysis' },
  { title: 'MikroTik', href: '/admin/mikrotik', icon: Router, description: 'Router Management' },
  { title: 'GenieACS', href: '/admin/genieacs', icon: Server, description: 'Device Management' },
  { title: 'Vouchers', href: '/admin/vouchers', icon: Ticket, description: 'Voucher Management' },
  { title: 'Map Monitoring', href: '/admin/map', icon: Map, description: 'Network Monitoring' },
  { title: 'Infrastructure', href: '/admin/infrastructure', icon: Building, description: 'ODP & ODC Management' },
  { title: 'Trouble Reports', href: '/admin/reports', icon: AlertTriangle, description: 'Customer Reports' },
];

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { user, loading, logout } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // State Management
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('adminTheme') === 'dark';
  });

  // Notifications state
  type NotifyItem = {
    id: string;
    title: string;
    description?: string;
    timestamp: string;
    status: 'success' | 'warning' | 'error' | 'info';
    source: 'activity' | 'device' | 'pppoe';
    read?: boolean;
    createdAt: number;
  };
  const [notifications, setNotifications] = useState<NotifyItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadAt, setLastReadAt] = useState<number>(() => {
    const v = localStorage.getItem('adminNotifications:lastReadAt');
    return v ? parseInt(v) || 0 : 0;
  });
  const prevDeviceStatusRef = useRef<Record<string, 'online' | 'offline'>>({});
  const prevPPPoeActiveRef = useRef<Record<string, boolean>>({});
  const isPollingRef = useRef(false);

  // Effect for theme
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('adminTheme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Helper to add notifications with de-dup by id
  const pushNotifications = (items: NotifyItem[]) => {
    if (!items.length) return;
    setNotifications((prev) => {
      const existingIds = new Set(prev.map((n) => n.id));
      const merged = [...items.filter((i) => !existingIds.has(i.id)), ...prev];
      // cap to last 50
      const capped = merged.slice(0, 50);
      // recompute unread based on lastReadAt
      const unread = capped.filter((n) => n.createdAt > lastReadAt).length;
      setUnreadCount(unread);
      return capped;
    });
  };

  const markAllRead = () => {
    const now = Date.now();
    setLastReadAt(now);
    localStorage.setItem('adminNotifications:lastReadAt', String(now));
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  // Polling for activities/devices/pppoe
  useEffect(() => {
    let timer: number | undefined;

    const poll = async () => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;
      try {
        // Admin activities
        try {
          const resp = await fetch('/api/admin/activities', { credentials: 'include' });
          const data = await resp.json();
          if (data?.success && Array.isArray(data.activities)) {
            const items: NotifyItem[] = data.activities.slice(0, 5).map((a: any) => ({
              id: a.id || `act-${a.timestamp}-${a.title}`,
              title: a.title || 'Activity',
              description: a.description,
              timestamp: a.timestamp || new Date().toLocaleString('id-ID'),
              status: (a.status as any) || 'info',
              source: 'activity',
              createdAt: Date.now(),
            }));
            pushNotifications(items);
          }
        } catch {}

        // Devices - detect online/offline transitions
        try {
          const resp = await fetch('/api/admin/genieacs/devices', { credentials: 'include' });
          const data = await resp.json();
          if (data?.success && Array.isArray(data.devices)) {
            const prev = prevDeviceStatusRef.current;
            const next: Record<string, 'online' | 'offline'> = {};
            const deltas: NotifyItem[] = [];
            for (const d of data.devices) {
              const id = d.id || d.serialNumber;
              const status = (d.status === 'online' ? 'online' : 'offline') as 'online' | 'offline';
              next[id] = status;
              if (prev[id] && prev[id] !== status) {
                const becameOnline = status === 'online';
                deltas.push({
                  id: `dev-${id}-${status}-${Date.now()}`,
                  title: becameOnline ? 'Device came back online' : 'Device went offline',
                  description: `ONU ${d.serialNumber || id}`,
                  timestamp: new Date().toLocaleString('id-ID'),
                  status: becameOnline ? 'success' : 'error',
                  source: 'device',
                  createdAt: Date.now(),
                });
              }
            }
            prevDeviceStatusRef.current = next;
            pushNotifications(deltas);
          }
        } catch {}

        // PPPoE users - detect active/inactive changes
        try {
          const resp = await fetch('/api/admin/mikrotik/users/api', { credentials: 'include' });
          const data = await resp.json();
          if (data?.success && Array.isArray(data.users)) {
            const prev = prevPPPoeActiveRef.current;
            const next: Record<string, boolean> = {};
            const deltas: NotifyItem[] = [];
            for (const u of data.users) {
              const username = u.username || '';
              const active = !!u.active;
              next[username] = active;
              if (username in prev && prev[username] !== active) {
                deltas.push({
                  id: `ppp-${username}-${active ? 'active' : 'inactive'}-${Date.now()}`,
                  title: active ? 'PPP user connected' : 'PPP user disconnected',
                  description: `User ${username}`,
                  timestamp: new Date().toLocaleString('id-ID'),
                  status: active ? 'info' : 'warning',
                  source: 'pppoe',
                  createdAt: Date.now(),
                });
              }
            }
            prevPPPoeActiveRef.current = next;
            pushNotifications(deltas);
          }
        } catch {}
      } finally {
        isPollingRef.current = false;
        timer = window.setTimeout(poll, 30000); // 30s
      }
    };

    // Prime initial state without generating notifications on first snapshot
    (async () => {
      try {
        const [devResp, pppResp] = await Promise.all([
          fetch('/api/admin/genieacs/devices', { credentials: 'include' }),
          fetch('/api/admin/mikrotik/users/api', { credentials: 'include' }),
        ]);
        const [devJson, pppJson] = await Promise.all([devResp.json(), pppResp.json()]);
        if (devJson?.success && Array.isArray(devJson.devices)) {
          const snap: Record<string, 'online' | 'offline'> = {};
          for (const d of devJson.devices) {
            const id = d.id || d.serialNumber;
            const status = (d.status === 'online' ? 'online' : 'offline') as 'online' | 'offline';
            snap[id] = status;
          }
          prevDeviceStatusRef.current = snap;
        }
        if (pppJson?.success && Array.isArray(pppJson.users)) {
          const snap: Record<string, boolean> = {};
          for (const u of pppJson.users) {
            snap[u.username] = !!u.active;
          }
          prevPPPoeActiveRef.current = snap;
        }
      } catch {}
      poll();
    })();

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  // Handler Functions
  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/admin/login');
    }
  };

  const handleThemeToggle = () => setIsDarkMode(!isDarkMode);
  const handleSidebarToggle = () => setSidebarOpen(!sidebarOpen);
  const handleSidebarCollapse = () => setSidebarCollapsed(!sidebarCollapsed);

  const displayName = loading ? '...' : (user?.username);

  return (
    <div className={cn("min-h-screen transition-colors duration-200", isDarkMode ? "bg-gray-900" : "bg-gray-50")}>
      {/* Mobile Header */}
      <div className="lg:hidden">
        <header className={cn(
          "flex items-center justify-between px-4 py-3 border-b transition-colors duration-200 z-50 relative",
          isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        )}>
          {/* Left Section - Mobile Menu Button & Text */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleSidebarToggle} className={cn("lg:hidden", isDarkMode ? "text-gray-300 hover:text-white hover:bg-gray-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100")}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="w-32 h-auto flex-shrink-0">
              <img src={isDarkMode ? logoDark : logoLight} alt="Customer Portal Logo" className="w-32 h-8 object-contain" />
            </div>
          </div>

          {/* Right Section - Theme & User Dropdown */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleThemeToggle} className={cn("rounded-full p-2", isDarkMode ? "text-yellow-400 hover:bg-gray-700" : "text-gray-600 hover:bg-gray-100")} title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}>
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className={cn("flex items-center gap-2 px-3 py-2 h-10 rounded-lg transition-colors", isDarkMode ? "text-white hover:bg-gray-700 data-[state=open]:bg-gray-700" : "text-gray-900 hover:bg-gray-100 data-[state=open]:bg-gray-100")}>
                  <div className="relative w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {displayName}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={cn("w-72 mt-2", isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200")}> 
                <div className="px-3 pt-2 pb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Bell className="h-4 w-4" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 bg-red-500 text-white text-[10px] leading-4 rounded-full text-center">{unreadCount}</span>
                      )}
                    </div>
                    <span className="text-sm">Notifications</span>
                  </div>
                  <button onClick={markAllRead} className={cn("text-xs", isDarkMode ? "text-blue-300 hover:text-blue-200" : "text-blue-600 hover:text-blue-700")}>
                    Mark all read
                  </button>
                </div>
                <div className={cn("max-h-72 overflow-auto divide-y", isDarkMode ? "divide-gray-700" : "divide-gray-200")}> 
                  {notifications.length === 0 ? (
                    <div className="p-4 text-xs text-gray-500">No notifications</div>
                  ) : (
                    notifications.slice(0, 10).map((n) => (
                      <div key={n.id} className={cn("px-3 py-2 text-xs", isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-50")}> 
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{n.title}</span>
                          <span className={cn("ml-2 px-1.5 py-0.5 rounded", 
                            n.status === 'success' ? "bg-green-100 text-green-700" :
                            n.status === 'error' ? "bg-red-100 text-red-700" :
                            n.status === 'warning' ? "bg-orange-100 text-orange-700" :
                            "bg-blue-100 text-blue-700"
                          )}>
                            {n.status}
                          </span>
                        </div>
                        {n.description && <div className="mt-0.5 text-gray-600 dark:text-gray-300">{n.description}</div>}
                        <div className="mt-0.5 text-[10px] text-gray-500">{n.timestamp}</div>
                      </div>
                    ))
                  )}
                </div>
                <DropdownMenuItem asChild>
                  <Link to="/admin/settings" className={cn("flex items-center gap-3 py-2 w-full", isDarkMode ? "hover:bg-gray-700 text-gray-200" : "hover:bg-gray-50")}>
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className={isDarkMode ? "bg-gray-700" : "bg-gray-200"} />
                <DropdownMenuItem onClick={handleLogout} className={cn("flex items-center gap-3 py-2 text-red-600 focus:text-red-600", isDarkMode ? "hover:bg-gray-700 text-red-400 focus:text-red-400" : "hover:bg-red-50 focus:bg-red-50")}>
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
      </div>

      {/* Sidebar for Desktop & Mobile Overlay */}
      <div className={`lg:hidden ${sidebarOpen ? 'relative z-[60]' : ''}`}>
        <div className={`fixed inset-0 bg-black/30 backdrop-blur-sm transition-all duration-300 ease-in-out z-[55] ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={handleSidebarToggle} />
        <div className={`fixed inset-y-0 left-0 z-[60] w-80 max-w-[80vw] overflow-y-auto bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl px-6 py-6 shadow-2xl border-r border-gray-200/50 dark:border-gray-700/50 transform transition-all duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between">
            <div className="w-40 h-auto flex-shrink-0">
              <img src={isDarkMode ? logoDark : logoLight} alt="AxeLink Logo" className="w-full h-auto object-contain" />
            </div>
            <Button variant="ghost" size="sm" onClick={handleSidebarToggle} className="h-8 w-8 p-0 hover:bg-gray-100/70 dark:hover:bg-gray-700 transition-colors">
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
          <nav className="mt-6 flow-root">
            <div className="-my-6 divide-y divide-gray-500/10 dark:divide-gray-700">
              <div className="space-y-1 py-6">
                {menuItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} to={item.href} onClick={handleSidebarToggle} className={cn("group flex items-center gap-3 rounded-xl px-4 py-3 text-sm leading-6 font-semibold transition-all duration-200", isActive ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm border border-blue-200/50 dark:border-blue-800/50" : "text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-gray-50/80 dark:hover:bg-gray-700/50 hover:shadow-sm")}>
                      <Icon className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400")} aria-hidden="true" />
                      {item.title}
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>
        </div>
      </div>

      {/* Sidebar for Desktop */}
      <aside className={cn("hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-all duration-300 ease-in-out", sidebarCollapsed ? "lg:w-16" : "lg:w-64")}>
        <div className={cn("flex grow flex-col gap-y-5 overflow-y-auto bg-white dark:bg-gray-800 pb-4 border-r border-gray-200 dark:border-gray-700 transition-all duration-300", sidebarCollapsed ? "px-2" : "px-3")}>
          <div className={cn("flex items-center justify-between py-6 px-4 border-b flex-shrink-0 relative", isDarkMode ? "border-gray-700" : "border-gray-200")}>
            <div className="flex flex-1 justify-center">
              <div className={cn("flex flex-col items-center gap-1 transition-all duration-300", sidebarCollapsed ? "lg:opacity-0 lg:w-0 lg:overflow-hidden" : "opacity-100")}>
                <div className="w-36 h-8 flex-shrink-0">
                  <img src={isDarkMode ? logoDark : logoLight} alt="AxeLink Logo" className="w-full h-auto object-contain" />
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSidebarCollapse} className={cn("hidden lg:flex h-8 w-8 p-0 flex-shrink-0 hover:bg-gray-100/70 dark:hover:bg-gray-700 absolute right-0 top-1/2 transform -translate-y-1/2 z-10")} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {menuItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link to={item.href} className={cn("group flex rounded-md p-3 text-sm leading-6 font-semibold transition-all duration-200", isActive ? isDarkMode ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700" : isDarkMode ? "text-gray-300 hover:text-white hover:bg-gray-700" : "text-gray-700 hover:text-gray-900 hover:bg-gray-100", sidebarCollapsed ? "justify-center" : "gap-x-3")} title={sidebarCollapsed ? item.title : undefined}>
                          <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-blue-700 dark:text-white" : "text-gray-400 group-hover:text-blue-700 dark:group-hover:text-white")} aria-hidden="true" />
                          {!sidebarCollapsed && <span className="transition-opacity duration-200">{item.title}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>

              <li className="mt-auto">
                <div className={cn("border-t my-4", isDarkMode ? "border-gray-700" : "border-gray-200")} />
                <ul role="list" className="-mx-2 space-y-1">
                  <li>
                    <Link to="/admin/settings" className={cn("group flex rounded-md p-3 text-sm leading-6 font-semibold transition-all duration-200", location.pathname === '/admin/settings' ? isDarkMode ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700" : isDarkMode ? "text-gray-300 hover:text-white hover:bg-gray-700" : "text-gray-700 hover:text-gray-900 hover:bg-gray-100", sidebarCollapsed ? "justify-center" : "gap-x-3")} title={sidebarCollapsed ? "Settings" : undefined}>
                      <Settings className={cn("h-5 w-5 shrink-0", location.pathname === '/admin/settings' ? "text-blue-700 dark:text-white" : "text-gray-400 group-hover:text-blue-700 dark:group-hover:text-white")} aria-hidden="true" />
                      {!sidebarCollapsed && <span className="transition-opacity duration-200">Settings</span>}
                    </Link>
                  </li>
                  <li>
                    <Button variant="ghost" onClick={handleLogout} className={cn("w-full group flex rounded-md p-3 text-sm leading-6 font-semibold transition-all duration-200 justify-start", isDarkMode ? "text-red-400 hover:text-red-300 hover:bg-red-900/20" : "text-red-600 hover:text-red-700 hover:bg-red-50", sidebarCollapsed ? "justify-center" : "gap-x-3")} title={sidebarCollapsed ? "Logout" : undefined}>
                      <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
                      {!sidebarCollapsed && <span className="transition-opacity duration-200">Logout</span>}
                    </Button>
                  </li>
                </ul>
              </li>
            </ul>
          </nav>

          <div className={cn("p-4 border-t flex-shrink-0", isDarkMode ? "border-gray-700" : "border-gray-200")}>
            <div className={cn("text-xs text-center transition-opacity duration-300", isDarkMode ? "text-gray-400" : "text-gray-500", sidebarCollapsed ? "lg:opacity-0" : "opacity-100")}>
              AxeLink Apps <br /> © 2024 - Powered by AxeLink
            </div>
          </div>
        </div>
      </aside>

      <div className={`transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        <main className="py-1">
          <div className="px-1 sm:px-1 lg:px-2">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
