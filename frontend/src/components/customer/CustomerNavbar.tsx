import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Bell, 
  Search, 
  Settings, 
  User, 
  LogOut,
  Menu,
  Sun,
  Moon,
  ChevronDown,
  Wifi,
  Phone
} from 'lucide-react';

interface CustomerNavbarProps {
  onMenuToggle: () => void;
  isDarkMode?: boolean;
  onThemeToggle?: () => void;
  onLogout?: () => void;
}

export default function CustomerNavbar({ 
  onMenuToggle, 
  isDarkMode = false, 
  onThemeToggle, 
  onLogout 
}: CustomerNavbarProps) {
  // Get current customer data
  const getCurrentCustomer = () => {
    try {
      const user = localStorage.getItem('customerUser');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('Error parsing customer user data:', error);
      return null;
    }
  };

  const currentCustomer = getCurrentCustomer();
  const customerName = currentCustomer?.name || 'Customer';
  const customerInitials = customerName.split(' ').map(n => n[0]).join('').toUpperCase();

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      // Default logout behavior
      localStorage.removeItem('customerToken');
      localStorage.removeItem('customerUser');
      window.location.href = '/customer/login';
    }
  };

  return (
    <header className={`sticky top-0 z-40 w-full border-b ${
      isDarkMode 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex h-16 items-center px-4">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuToggle}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Logo/Title */}
        <div className="flex items-center space-x-4 lg:space-x-6">
          <h1 className={`hidden md:block text-lg font-semibold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            My ISP Account
          </h1>
        </div>

        {/* Connection Status */}
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-green-100 text-green-800">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <Wifi className="h-4 w-4" />
              <span className="text-sm font-medium">Online</span>
            </div>
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          {onThemeToggle && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onThemeToggle}
              className={isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          )}

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className={`relative ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-blue-500 rounded-full"></span>
          </Button>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                  isDarkMode 
                    ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" alt={customerName} />
                  <AvatarFallback className="bg-green-500 text-white text-sm">
                    {customerInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium">{customerName}</p>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Customer
                  </p>
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{customerName}</p>
                  <p className="text-xs text-muted-foreground">
                    {currentCustomer?.phone || currentCustomer?.id || 'customer@isp.com'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>My Profile</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem>
                <Wifi className="mr-2 h-4 w-4" />
                <span>WiFi Settings</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem>
                <Phone className="mr-2 h-4 w-4" />
                <span>Contact Support</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Account Settings</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={handleLogout}
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}