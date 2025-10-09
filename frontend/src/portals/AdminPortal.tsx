import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import AdminLayout from '@/layouts/AdminLayout';
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
import AdminSettings from '@/pages/admin/AdminSettings';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { isAuthenticated, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}

export default function AdminPortal() {
  return (
    <Routes>
      <Route path="/login" element={<AdminLogin />} />
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
              <Route path="/settings" element={<AdminSettings />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </AdminLayout>
        </AdminProtectedRoute>
      } />
    </Routes>
  );
}
