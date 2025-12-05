import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

interface MapStatusIndicatorProps {
  lastUpdated: Date | null;
  onRefresh: () => void;
  isLoading?: boolean;
}

export default function MapStatusIndicator({ lastUpdated, onRefresh, isLoading = false }: MapStatusIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState<string>('');

  useEffect(() => {
    if (!lastUpdated) {
      setTimeAgo('Never');
      return;
    }

    const updateTimeAgo = () => {
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000);

      if (diffInSeconds < 60) {
        setTimeAgo(`${diffInSeconds}s ago`);
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        setTimeAgo(`${minutes}m ago`);
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        setTimeAgo(`${hours}h ago`);
      } else {
        const days = Math.floor(diffInSeconds / 86400);
        setTimeAgo(`${days}d ago`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [lastUpdated]);

  return (
    <div className="absolute top-6 right-6 z-20 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-3 min-w-[200px]">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-sm text-gray-600 mb-1">Last updated</div>
          <div className="text-sm font-medium text-gray-900">
            {timeAgo}
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="ml-3 p-2 rounded-md bg-green-50 hover:bg-green-100 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors duration-200 group"
          title="Refresh evacuation center data"
        >
          <RefreshCw
            className={`w-4 h-4 text-green-600 group-hover:text-green-700 ${isLoading ? 'animate-spin' : ''}`}
          />
        </button>
      </div>

      {isLoading && (
        <div className="mt-2 text-xs text-green-600 flex items-center">
          <div className="animate-pulse mr-2">⟳</div>
          Refreshing...
        </div>
      )}
    </div>
  );
}
