import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminNavbar from '@/components/admin/AdminNavbar';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminLogin from '@/pages/admin/AdminLogin';
import AnalyticsDashboard from '@/pages/admin/AnalyticsDashboard';
import MikrotikManagement from '@/pages/admin/MikrotikManagement';
import GenieACSManagement from '@/pages/admin/GenieACSManagement';
import VoucherManagement from '@/pages/admin/VoucherManagement';
import VoucherPrint from '@/pages/admin/VoucherPrint';
import MapMonitoring from '@/pages/admin/MapMonitoring';
import InfrastructureManagement from '@/pages/admin/InfrastructureManagement';
import TroubleReports from '@/pages/admin/TroubleReports';
import CommandReference from '@/pages/admin/CommandReference';
import AdminSettings from '@/pages/admin/AdminSettings';
import { cn } from '@/lib/utils';
import { 
  Users, 
  Wifi, 
  Router, 
  Settings, 
  Activity
} from 'lucide-react';

// Admin Authentication Guard
interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { isAuthenticated, loading } = useAdminAuth();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // Authenticated - show protected content
  return <>{children}</>;
}

// Admin Layout Component
interface AdminLayoutProps {
  children: React.ReactNode;
}

function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('adminTheme');
    return saved === 'dark';
  });

  // Save theme preference
  useEffect(() => {
    localStorage.setItem('adminTheme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-200",
      isDarkMode ? "bg-gray-900" : "bg-gray-50"
    )}>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <AdminSidebar 
          isOpen={sidebarOpen} 
          onToggle={toggleSidebar}
          isDarkMode={isDarkMode}
        />
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Navbar */}
          <AdminNavbar 
            onMenuToggle={toggleSidebar}
            isDarkMode={isDarkMode}
            onThemeToggle={toggleTheme}
          />

          {/* Main Content */}
          <main className={cn(
            "flex-1 overflow-auto transition-colors duration-200",
            isDarkMode ? "bg-gray-900" : "bg-gray-50"
          )}>
            <div className="h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function AdminPortal() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<AdminLogin />} />
      
      {/* Admin Routes - Protected */}
      <Route path="/*" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <Routes>
              <Route path="/" element={<AdminDashboard />} />
              <Route path="/analytics" element={<AnalyticsDashboard />} />
              <Route path="/genieacs" element={<GenieACSManagement />} />
              <Route path="/mikrotik" element={<MikrotikManagement />} />
              <Route path="/vouchers" element={<VoucherManagement />} />
              <Route path="/vouchers/print" element={<VoucherPrint />} />
              <Route path="/map" element={<MapMonitoring />} />
              <Route path="/infrastructure" element={<InfrastructureManagement />} />
              <Route path="/reports" element={<TroubleReports />} />
              <Route path="/commands" element={<CommandReference />} />
              <Route path="/settings" element={<AdminSettings />} />
              <Route path="/mikrotik" element={
                <div className="p-4 sm:p-6">
                  <h1 className="text-xl sm:text-2xl font-bold mb-4">Mikrotik Management</h1>
                  <p className="text-gray-600">Mikrotik management features coming soon...</p>
                </div>
              } />
              <Route path="/users" element={
                <div className="p-4 sm:p-6">
                  <h1 className="text-xl sm:text-2xl font-bold mb-4">User Management</h1>
                  <p className="text-gray-600">User management features coming soon...</p>
                </div>
              } />
              <Route path="/reports" element={
                <div className="p-4 sm:p-6">
                  <h1 className="text-xl sm:text-2xl font-bold mb-4">Trouble Reports</h1>
                  <p className="text-gray-600">Trouble report management coming soon...</p>
                </div>
              } />
              <Route path="/settings" element={
                <div className="p-4 sm:p-6">
                  <h1 className="text-xl sm:text-2xl font-bold mb-4">Settings</h1>
                  <p className="text-gray-600">Settings panel coming soon...</p>
                </div>
              } />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </AdminLayout>
        </AdminProtectedRoute>
      } />
    </Routes>
  );
}