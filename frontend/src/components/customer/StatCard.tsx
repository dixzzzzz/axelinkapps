import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number | React.ReactNode;
  status?: 'online' | 'offline' | 'normal' | 'success' | 'warning' | 'error';
  className?: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ 
  icon, 
  label, 
  value, 
  status = 'normal', 
  className = '',
  onClick
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'online':
      case 'success':
        return 'border-green-400 bg-green-50 hover:bg-green-100';
      case 'offline':
      case 'warning':
        return 'border-yellow-400 bg-yellow-50 hover:bg-yellow-100';
      case 'error':
        return 'border-red-400 bg-red-50 hover:bg-red-100';
      default:
        return 'border-blue-400 bg-blue-50 hover:bg-blue-100';
    }
  };

  return (
    <Card 
      className={`
        transition-all duration-300 hover:shadow-md hover:-translate-y-1 border-l-4 
        ${getStatusColor()} 
        ${onClick ? 'cursor-pointer' : ''} 
        ${className}
      `}
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3 md:flex-col md:text-center lg:flex-row lg:text-left">
          <div className="flex-shrink-0 p-1.5 sm:p-2 rounded-lg bg-white shadow-sm">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
              {label}
            </div>
            <div className="text-sm md:text-base font-bold text-gray-900 truncate">
              {value}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;
