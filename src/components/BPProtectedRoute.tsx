import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useBoothPilot } from '../context/BoothPilotContext';

interface BPProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const BPProtectedRoute: React.FC<BPProtectedRouteProps> = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, isLoading, user } = useBoothPilot();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/boothpilot/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/boothpilot" replace />;
  }

  return <>{children}</>;
};

export default BPProtectedRoute;
