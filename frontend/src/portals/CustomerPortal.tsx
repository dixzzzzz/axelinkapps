import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import CustomerDashboard from '@/pages/customer/CustomerDashboard';
import CustomerLogin from '@/pages/customer/CustomerLogin';
import CustomerMap from '@/pages/customer/CustomerMap';
import CustomerTrouble from '@/pages/customer/CustomerTrouble';
import CustomerLayout from '@/layouts/CustomerLayout';

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, user, authStep } = useCustomerAuth();

  console.log('🛑️ ProtectedRoute check:', { 
    isAuthenticated, 
    loading, 
    user: user?.phone, 
    authStep, 
    localStorage: import.meta.env.DEV ? localStorage.getItem('dev_customer_session') : 'N/A'
  });

  if (loading) {
    console.log('🔄 ProtectedRoute: Still loading...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('❌ ProtectedRoute: Not authenticated, redirecting to login');
    return <Navigate to="/customer/login" replace />;
  }

  console.log('✅ ProtectedRoute: Authenticated, showing protected content');
  return <>{children}</>;
}

export default function CustomerPortal() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="login" element={<CustomerLogin />} />
      
      {/* Protected Routes */}
      <Route path="*" element={
        <ProtectedRoute>
          <CustomerLayout>
            <Routes>
              <Route path="" element={<CustomerDashboard />} />
              <Route path="dashboard" element={<CustomerDashboard />} />
              <Route path="map" element={<CustomerMap />} />
              <Route path="reports" element={<CustomerTrouble />} />
              <Route path="*" element={<Navigate to="/customer" replace />} />
            </Routes>
          </CustomerLayout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}
