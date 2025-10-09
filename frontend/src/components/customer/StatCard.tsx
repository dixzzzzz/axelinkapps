import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
        return 'border-green-400 bg-green-50 hover:bg-green-100 dark:border-green-600 dark:bg-green-950/50 dark:hover:bg-green-900/50';
      case 'offline':
      case 'warning':
        return 'border-yellow-400 bg-yellow-50 hover:bg-yellow-100 dark:border-yellow-600 dark:bg-yellow-950/50 dark:hover:bg-yellow-900/50';
      case 'error':
        return 'border-red-400 bg-red-50 hover:bg-red-100 dark:border-red-600 dark:bg-red-950/50 dark:hover:bg-red-900/50';
      default:
        return 'border-blue-400 bg-blue-50 hover:bg-blue-100 dark:border-blue-600 dark:bg-blue-950/50 dark:hover:bg-blue-900/50';
    }
  };

  return (
    <Card 
      className={cn(
        "transition-all duration-300 hover:shadow-md hover:-translate-y-1 border-l-4",
        getStatusColor(),
        onClick ? 'cursor-pointer' : '',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3 md:flex-col md:text-center lg:flex-row lg:text-left">
          <div className="flex-shrink-0 p-1.5 sm:p-2 rounded-lg bg-gray-100 dark:bg-gray-800 shadow-sm dark:shadow-none">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 dark:text-gray-400">
              {label}
            </div>
            <div className="text-sm md:text-base font-bold text-gray-900 truncate dark:text-gray-100">
              {value}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;
