import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Home,
  Wifi,
  Settings,
  HelpCircle,
  FileText,
  Activity,
  CreditCard,
  MapPin,
  Phone,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface CustomerSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  isDarkMode?: boolean;
  isCollapsed?: boolean;
  onCollapse?: () => void;
}

const menuItems = [
  {
    title: 'Dashboard',
    icon: Home,
    href: '/customer',
    active: true
  },
  {
    title: 'WiFi Settings',
    icon: Wifi,
    href: '/customer/wifi'
  },
  {
    title: 'Service Status',
    icon: Activity,
    href: '/customer/status'
  },
  {
    title: 'Billing',
    icon: CreditCard,
    href: '/customer/billing'
  },
  {
    title: 'Coverage Map',
    icon: MapPin,
    href: '/customer/map'
  },
  {
    title: 'Trouble Reports',
    icon: FileText,
    href: '/customer/reports'
  },
  {
    title: 'Support',
    icon: HelpCircle,
    href: '/customer/support'
  },
  {
    title: 'Contact',
    icon: Phone,
    href: '/customer/contact'
  },
  {
    title: 'Settings',
    icon: Settings,
    href: '/customer/settings'
  }
];

export default function CustomerSidebar({ 
  isOpen, 
  onToggle, 
  isDarkMode = false,
  isCollapsed = false,
  onCollapse
}: CustomerSidebarProps) {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 z-50 h-full transition-all duration-300 ease-in-out lg:relative lg:translate-x-0",
        isCollapsed ? "w-16" : "w-64",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        isDarkMode ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200",
        "border-r shadow-lg lg:shadow-none"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg flex items-center justify-center">
                <Home className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className={cn(
                  "text-lg font-semibold",
                  isDarkMode ? "text-white" : "text-gray-900"
                )}>
                  Customer Portal
                </h2>
              </div>
            </div>
          )}
          
          {/* Mobile Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onToggle}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Desktop Collapse Button */}
          {onCollapse && (
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex"
              onClick={onCollapse}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Button
                  key={index}
                  variant={item.active ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 h-11",
                    isCollapsed && "justify-center px-2",
                    item.active && "bg-green-500 hover:bg-green-600 text-white",
                    !item.active && isDarkMode && "text-gray-300 hover:text-white hover:bg-gray-800",
                    !item.active && !isDarkMode && "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5 flex-shrink-0",
                    isCollapsed && "h-4 w-4"
                  )} />
                  {!isCollapsed && (
                    <span className="font-medium">{item.title}</span>
                  )}
                </Button>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        {!isCollapsed && (
          <div className={cn(
            "p-4 border-t",
            isDarkMode ? "border-gray-700" : "border-gray-200"
          )}>
            <div className={cn(
              "text-xs text-center",
              isDarkMode ? "text-gray-400" : "text-gray-500"
            )}>
              <p>Customer Portal v1.0</p>
              <p>© 2024 ISP Management</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}