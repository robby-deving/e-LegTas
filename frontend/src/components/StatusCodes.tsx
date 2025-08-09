import React from 'react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

import Error401 from '@/assets/401.svg';
import Error403 from '@/assets/403.svg';
import Error404 from '@/assets/404.svg';
import Error500 from '@/assets/500.svg';

interface StatusCodeProps {
  code: 401 | 403 | 404 | 500;
  className?: string;
  onActionClick?: () => void;
}

const statusConfig = {
  401: {
    title: 'Unauthorized – Not Logged In',
    description: 'You must be logged in to view this page.',
    buttonText: 'Go to login',
    image: Error401,
    titleColor: 'text-[#2390DA]',
    buttonVariant: 'default' as const,
  },
  403: {
    title: 'Forbidden – Access Denied',
    description: "You don't have permission to view this page.",
    buttonText: 'Go back',
    image: Error403,
    titleColor: 'text-[#E93535]',
    buttonVariant: 'default' as const,
  },
  404: {
    title: 'Not Found – Page Missing',
    description: "Sorry, we couldn't find that page.",
    buttonText: 'Back to previous page',
    image: Error404,
    titleColor: 'text-[#FC7F1B]',
    buttonVariant: 'default' as const,
  },
  500: {
    title: 'Internal Server Error – Server Down',
    description: 'Oops! Something broke on our end.',
    buttonText: 'Retry',
    image: Error500,
    titleColor: 'text-[#793CB5]',
    buttonVariant: 'default' as const,
  },
};

const StatusCodes: React.FC<StatusCodeProps> = ({ 
  code, 
  className,
  onActionClick 
}) => {
  const config = statusConfig[code];

  const handleActionClick = () => {
    if (onActionClick) {
      onActionClick();
    } else {
      // Default actions based on error type
      switch (code) {
        case 401:
          // Navigate to login page
          window.location.href = '/login';
          break;
        case 403:
        case 404:
          // Go back to previous page
          window.history.back();
          break;
        case 500:
          // Reload the page
          window.location.reload();
          break;
      }
    }
  };

  return (
    <div className={cn(
      "min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8",
      className
    )}>
      <div className="max-w-lg lg:max-w-2xl w-full text-center">
        {/* Error Image */}
        <div className="mb-8 flex justify-center">
          <img 
            src={config.image} 
            alt={`Error ${code}`}
            className="w-full max-w-lg h-auto"
          />
        </div>
        
        {/* Error Title */}
        <h1 className={cn(
          "text-2xl font-extrabold mb-3 px-4 lg:whitespace-nowrap",
          config.titleColor,
          // Responsive text sizes
          "sm:text-3xl lg:text-3xl"
        )}>
          {config.title}
        </h1>
        
        {/* Error Description */}
        <p className="text-gray-600 mb-8 px-4 text-sm sm:text-base lg:text-md">
          {config.description}
        </p>
        
        {/* Action Button */}
        <Button 
          onClick={handleActionClick}
          variant={config.buttonVariant}
          className="bg-green-600 cursor-pointer hover:bg-green-700 text-white px-8 py-2 rounded-md font-medium transition-colors duration-200 text-sm sm:text-sm"
        >
          {config.buttonText}
        </Button>
      </div>
    </div>
  );
};

export default StatusCodes;
