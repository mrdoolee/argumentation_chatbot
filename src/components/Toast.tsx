import React from 'react';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'warning' | 'error';
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success' }) => {
  const getColors = () => {
    switch (type) {
      case 'error':
        return 'bg-red-600 text-white border-red-700 shadow-red-200';
      case 'warning':
        return 'bg-amber-500 text-white border-amber-600 shadow-amber-200';
      case 'success':
      default:
        return 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-200';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'error':
      case 'warning':
        return <AlertTriangle className="w-5 h-5 shrink-0" />;
      case 'success':
      default:
        return <CheckCircle className="w-5 h-5 shrink-0" />;
    }
  };

  return (
    <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 animate-bounce duration-300 max-w-md w-11/12">
      <div
        className={`flex items-start gap-3 p-4 rounded-2xl border shadow-lg ${getColors()} backdrop-blur-md transition-all`}
      >
        {getIcon()}
        <div className="text-sm font-semibold leading-relaxed whitespace-pre-line">
          {message}
        </div>
      </div>
    </div>
  );
};
