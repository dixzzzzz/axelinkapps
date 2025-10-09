// This file is now replaced by the new AdminPortal system
// Redirect to the new admin portal
import { Navigate } from 'react-router-dom';

export default function Index() {
  return <Navigate to="/admin" replace />;
}