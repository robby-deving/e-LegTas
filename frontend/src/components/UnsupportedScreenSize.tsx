import React from 'react';
import { cn } from '@/lib/utils';

import UnsupportedScreenSizeImage from '@/assets/unsupported-screensize.svg';

interface UnsupportedScreenSizeProps {
  className?: string;
}

const UnsupportedScreenSize: React.FC<UnsupportedScreenSizeProps> = ({ 
  className 
}) => {
  return (
    <div className={cn(
      "min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8",
      className
    )}>
      <div className="max-w-lg lg:max-w-2xl w-full text-center">
        {/* Screen Size Image */}
        <div className="mb-8 flex justify-center">
          <img 
            src={UnsupportedScreenSizeImage} 
            alt="Unsupported Screen Size"
            className="w-full max-w-xs h-auto"
          />
        </div>
        
        {/* Title */}
        <h1 className={cn(
          "text-2xl font-extrabold mb-3 px-4",
          "text-[#0F9D58]",
          // Responsive text sizes
          "sm:text-3xl lg:text-3xl"
        )}>
          Screen size not supported
        </h1>
        
        {/* Description */}
        <p className="text-gray-600 mb-8 px-4 text-sm sm:text-base lg:text-md">
          We are sorry but this screen size is not supported. <br/>Please switch to a larger screen size.
        </p>
      </div>
    </div>
  );
};

export default UnsupportedScreenSize;
