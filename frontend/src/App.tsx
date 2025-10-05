import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import AdminPortal from './portals/AdminPortal';
import CustomerPortal from './portals/CustomerPortal';

const queryClient = new QueryClient();

// Get portal type from environment
const portalType = import.meta.env.VITE_PORTAL_TYPE;

// Portal-specific routing components
const AdminApp = () => (
  <BrowserRouter basename="/u"
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }}
  >
    <Routes>
      <Route path="/" element={<Navigate to="/admin/login" replace />} />
      <Route path="/admin/*" element={<AdminPortal />} />
      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  </BrowserRouter>
);

const CustomerApp = () => (
  <BrowserRouter basename="/x"
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }}
  >
    <Routes>
      <Route path="/" element={<Navigate to="/customer/login" replace />} />
      <Route path="/customer/*" element={<CustomerPortal />} />
      <Route path="*" element={<Navigate to="/customer/login" replace />} />
    </Routes>
  </BrowserRouter>
);

// Default combined app (fallback)
const CombinedApp = () => (
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }}
  >
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/admin/*" element={<AdminPortal />} />
      <Route path="/customer/*" element={<CustomerPortal />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

// Main App component with conditional rendering
const App = () => {
  console.log('🚀 Portal Type:', portalType);
  
  // Update document title based on portal type
  document.title = import.meta.env.VITE_APP_TITLE || 'ISP Management System';
  
  const renderApp = () => {
    switch (portalType) {
      case 'admin':
        return <AdminApp />;
      case 'customer':
        return <CustomerApp />;
      default:
        return <CombinedApp />;
    }
  };
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {renderApp()}
      </TooltipProvider>
    </QueryClientProvider>
  );
};


export default App;
