import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Menu,
  Home,
  Router,
  Wifi,
  Settings,
  Users,
  BarChart3,
  Bell,
  Moon,
  Sun,
  LogOut
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function Layout({ children, title = "ISP Portal" }: LayoutProps) {
  const [isDark, setIsDark] = useState(false);
  const [notifications] = useState(3);

  const menuItems = [
    { icon: Home, label: 'Dashboard', href: '/', active: true },
    { icon: Users, label: 'Customers', href: '/customers' },
    { icon: Router, label: 'GenieACS', href: '/genieacs' },
    { icon: Wifi, label: 'Mikrotik', href: '/mikrotik' },
    { icon: BarChart3, label: 'Analytics', href: '/analytics' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ];

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 ${isDark ? 'dark' : ''}`}>
      {/* Mobile Header */}
      <header className="lg:hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-3 p-4 border-b">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                      <Wifi className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="font-semibold">ISP Portal</h2>
                      <p className="text-xs text-muted-foreground">Admin Dashboard</p>
                    </div>
                  </div>
                  <nav className="flex-1 p-4">
                    <ul className="space-y-2">
                      {menuItems.map((item) => (
                        <li key={item.label}>
                          <a
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                              item.active
                                ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <item.icon className="h-4 w-4" />
                            {item.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                  <div className="p-4 border-t">
                    <Button variant="ghost" className="w-full justify-start gap-2">
                      <LogOut className="h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="font-semibold text-lg">{title}</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {notifications > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs">
                  {notifications}
                </Badge>
              )}
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarImage src="/assets/img/admin-avatar.jpg" />
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-r border-slate-200 dark:border-slate-700 px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Wifi className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">ISP Portal</h2>
              <p className="text-xs text-muted-foreground">Admin Dashboard</p>
            </div>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {menuItems.map((item) => (
                    <li key={item.label}>
                      <a
                        href={item.href}
                        className={`group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors ${
                          item.active
                            ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </li>
              <li className="mt-auto">
                <div className="flex items-center gap-3 p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/assets/img/admin-avatar.jpg" />
                    <AvatarFallback>AD</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Admin User</p>
                    <p className="text-xs text-muted-foreground">admin@isp.com</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={toggleTheme}>
                    {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </Button>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-72">
        <main className="py-4 lg:py-10">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}