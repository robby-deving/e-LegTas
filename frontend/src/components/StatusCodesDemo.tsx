import React, { useState } from 'react';
import StatusCodes from '@/components/StatusCodes';
import { Button } from '@/components/ui/button';

const StatusCodesDemo: React.FC = () => {
  const [currentCode, setCurrentCode] = useState<401 | 403 | 404 | 500>(404);

  const errorCodes = [401, 403, 404, 500] as const;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Demo Controls */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-10 bg-white p-4 rounded-lg shadow-lg">
        <div className="flex gap-2 flex-wrap justify-center">
          {errorCodes.map((code) => (
            <Button
              key={code}
              onClick={() => setCurrentCode(code)}
              variant={currentCode === code ? "default" : "outline"}
              size="sm"
            >
              {code}
            </Button>
          ))}
        </div>
      </div>

      {/* Status Code Component */}
      <StatusCodes 
        code={currentCode}
        onActionClick={() => {
          console.log(`Action clicked for error ${currentCode}`);
          // Custom action for demo
          alert(`Custom action for error ${currentCode}`);
        }}
      />
    </div>
  );
};

export default StatusCodesDemo;
