import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  BarChart3, 
  Server, 
  Ticket, 
  Map, 
  AlertTriangle, 
  Router, 
  Users, 
  BookOpen,
  Building,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface AdminSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  isDarkMode: boolean;
  isCollapsed?: boolean;
  onCollapse?: () => void;
}

const menuItems = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    description: 'Overview sistem'
  },
  {
    title: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    description: 'Analisis data'
  },
  {
    title: 'GenieACS',
    href: '/admin/genieacs',
    icon: Server,
    description: 'Device management'
  },
  {
    title: 'Vouchers',
    href: '/admin/vouchers',
    icon: Ticket,
    description: 'Voucher management'
  },
  {
    title: 'Map Monitoring',
    href: '/admin/map',
    icon: Map,
    description: 'Network monitoring'
  },
  {
    title: 'Infrastructure',
    href: '/admin/infrastructure',
    icon: Building,
    description: 'ODP & ODC management'
  },
  {
    title: 'Trouble Reports',
    href: '/admin/reports',
    icon: AlertTriangle,
    description: 'Customer reports'
  },
  {
    title: 'MikroTik',
    href: '/admin/mikrotik',
    icon: Router,
    description: 'Router management'
  },
  {
    title: 'Users',
    href: '/admin/users',
    icon: Users,
    description: 'User management'
  },
  {
    title: 'Command',
    href: '/admin/commands',
    icon: BookOpen,
    description: 'WhatsApp commands'
  }
];

export default function AdminSidebar({ 
  isOpen, 
  onToggle, 
  isDarkMode, 
  isCollapsed = false, 
  onCollapse 
}: AdminSidebarProps) {
  const location = useLocation();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-[1500] lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 z-[2000] h-full transform transition-all duration-300 ease-in-out lg:relative lg:translate-x-0",
        // Mobile behavior
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        // Desktop width - collapsed/expanded
        isCollapsed ? "lg:w-16" : "lg:w-64",
        // Mobile width
        "w-64",
        isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200",
        "border-r flex flex-col"
      )}>
        {/* Header */}
        <div className={cn(
          "flex items-center justify-between p-4 border-b flex-shrink-0",
          isDarkMode ? "border-gray-700" : "border-gray-200"
        )}>
          <div className={cn(
            "flex items-center gap-3 transition-opacity duration-300",
            isCollapsed ? "lg:opacity-0 lg:w-0 lg:overflow-hidden" : "opacity-100"
          )}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <div className="min-w-0">
              <h2 className={cn(
                "font-semibold text-lg truncate",
                isDarkMode ? "text-white" : "text-gray-900"
              )}>
                AxeApps
              </h2>
              <p className={cn(
                "text-xs truncate",
                isDarkMode ? "text-gray-400" : "text-gray-500"
              )}>
                Admin Portal
              </p>
            </div>
          </div>
          
          {/* Collapse button for desktop */}
          {onCollapse && (
            <button
              onClick={onCollapse}
              className={cn(
                "hidden lg:flex p-1 rounded-md transition-colors",
                isDarkMode ? "text-gray-400 hover:text-white hover:bg-gray-700" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              )}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          )}
          
          {/* Close button for mobile */}
          <button
            onClick={onToggle}
            className={cn(
              "lg:hidden p-2 rounded-md",
              isDarkMode ? "text-gray-400 hover:text-white hover:bg-gray-700" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            )}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => {
                    // Close sidebar on mobile after navigation
                    if (window.innerWidth < 1024) {
                      onToggle();
                    }
                  }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group relative",
                    isActive
                      ? isDarkMode
                        ? "bg-blue-600 text-white"
                        : "bg-blue-100 text-blue-700"
                      : isDarkMode
                        ? "text-gray-300 hover:text-white hover:bg-gray-700"
                        : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  )}
                  title={isCollapsed ? item.title : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  
                  {/* Text content - hidden when collapsed on desktop */}
                  <div className={cn(
                    "flex-1 min-w-0 transition-all duration-300",
                    isCollapsed ? "lg:opacity-0 lg:w-0 lg:overflow-hidden" : "opacity-100"
                  )}>
                    <div className="truncate">{item.title}</div>
                    <div className={cn(
                      "text-xs truncate",
                      isActive
                        ? isDarkMode
                          ? "text-blue-200"
                          : "text-blue-600"
                        : isDarkMode
                          ? "text-gray-400"
                          : "text-gray-500"
                    )}>
                      {item.description}
                    </div>
                  </div>

                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className={cn(
                      "absolute left-full ml-2 px-2 py-1 rounded-md text-sm whitespace-nowrap z-50",
                      "opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none",
                      "hidden lg:block",
                      isDarkMode ? "bg-gray-900 text-white border border-gray-700" : "bg-white text-gray-900 border border-gray-200 shadow-lg"
                    )}>
                      <div className="font-medium">{item.title}</div>
                      <div className={cn(
                        "text-xs",
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      )}>
                        {item.description}
                      </div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className={cn(
          "p-4 border-t flex-shrink-0",
          isDarkMode ? "border-gray-700" : "border-gray-200"
        )}>
          <div className={cn(
            "text-xs text-center transition-opacity duration-300",
            isDarkMode ? "text-gray-400" : "text-gray-500",
            isCollapsed ? "lg:opacity-0" : "opacity-100"
          )}>
            AxeLink Apps
            <br />
            © 2024 - Powered by AxeLink
          </div>
        </div>
      </aside>
    </>
  );
}