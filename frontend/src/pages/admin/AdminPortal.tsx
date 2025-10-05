import { Routes, Route, Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import AdminLogin from '../AdminLogin';
import AdminDashboard from './AdminDashboard';
import CustomerManagement from './CustomerManagement';

export default function AdminPortal() {
  const { isAuthenticated, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  return (
    <Routes>
      <Route path="/" element={<AdminDashboard />} />
      <Route path="/dashboard" element={<AdminDashboard />} />
      <Route path="/customers" element={<CustomerManagement />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}