import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Menu, 
  Bell, 
  Settings, 
  User, 
  Sun, 
  Moon,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface AdminNavbarProps {
  onMenuToggle: () => void;
  isDarkMode: boolean;
  onThemeToggle: () => void;
}

export default function AdminNavbar({ onMenuToggle, isDarkMode, onThemeToggle }: AdminNavbarProps) {
  const navigate = useNavigate();
  const { user, loading, logout } = useAdminAuth();

  const displayName = loading ? '...' : (user?.username || 'Admin');

  // Handle logout via API and session cleanup
  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/admin/login');
    }
  };

  return (
    <header className={cn(
      "flex items-center justify-between px-4 py-3 border-b transition-colors duration-200",
      isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
    )}>
      {/* Left Section - Mobile Menu Button Only */}
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuToggle}
          className={cn(
            "lg:hidden",
            isDarkMode ? "text-gray-300 hover:text-white hover:bg-gray-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          )}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onThemeToggle}
          className={cn(
            "rounded-full p-2",
            isDarkMode ? "text-yellow-400 hover:bg-gray-700" : "text-gray-600 hover:bg-gray-100"
          )}
          title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* User Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "flex items-center gap-2 px-3 py-2 h-10 rounded-lg transition-colors",
                isDarkMode 
                  ? "text-white hover:bg-gray-700 data-[state=open]:bg-gray-700" 
                  : "text-gray-900 hover:bg-gray-100 data-[state=open]:bg-gray-100"
              )}
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium">
                {displayName}
              </span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className={cn(
              "w-56 mt-2",
              isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
            )}
          >
            {/* Notifications */}
            <DropdownMenuItem className={cn(
              "flex items-center gap-3 py-2",
              isDarkMode ? "hover:bg-gray-700 text-gray-200" : "hover:bg-gray-50"
            )}>
              <div className="relative">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 text-white text-xs rounded-full flex items-center justify-center text-[10px]">
                  3
                </span>
              </div>
              <span>Notifications</span>
            </DropdownMenuItem>
            
            {/* Settings */}
            <DropdownMenuItem asChild>
              <Link 
                to="/admin/settings" 
                className={cn(
                  "flex items-center gap-3 py-2 w-full",
                  isDarkMode ? "hover:bg-gray-700 text-gray-200" : "hover:bg-gray-50"
                )}
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator className={isDarkMode ? "bg-gray-700" : "bg-gray-200"} />
            
            {/* Logout */}
            <DropdownMenuItem 
              onClick={handleLogout}
              className={cn(
                "flex items-center gap-3 py-2 text-red-600 focus:text-red-600",
                isDarkMode 
                  ? "hover:bg-gray-700 text-red-400 focus:text-red-400" 
                  : "hover:bg-red-50 focus:bg-red-50"
              )}
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}