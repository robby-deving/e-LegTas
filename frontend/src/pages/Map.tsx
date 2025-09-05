import { useState, useCallback } from 'react';
import { usePageTitle } from '../hooks/usePageTitle';
import GISMap from '../components/Map/GISMap';
import EvacuationCenterSidebar from '../components/Map/EvacuationCenterSidebar';
import MapStatusIndicator from '../components/Map/MapStatusIndicator';
import type { EvacuationCenter } from '@/types/EvacuationCenter';




export default function Map() {
  usePageTitle('Map');

  const [selectedEvacuationCenter, setSelectedEvacuationCenter] = useState<EvacuationCenter | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleLastUpdatedChange = useCallback((timestamp: Date | null) => {
    setLastUpdated(timestamp);
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    // Use the refresh function exposed by GISMap component
    if (typeof window !== 'undefined' && (window as any).gisMapRefresh) {
      (window as any).gisMapRefresh();
      // Reset refreshing state after a short delay
      setTimeout(() => setIsRefreshing(false), 1000);
    } else {
      setIsRefreshing(false);
    }
  }, []);

  return (
    <div className="flex h-full overflow-hidden relative">
      <div className="flex-grow relative z-0">
        <GISMap
          onMarkerClick={setSelectedEvacuationCenter}
          onLastUpdatedChange={handleLastUpdatedChange}
        />
      </div>

      {/* Status indicator - only show when no evacuation center is selected */}
      {!selectedEvacuationCenter && (
        <MapStatusIndicator
          lastUpdated={lastUpdated}
          onRefresh={handleRefresh}
          isLoading={isRefreshing}
        />
      )}

      {/* Sidebar for smooth entrance/exit */}
      <div
        className={`absolute right-0 top-0 h-full w-80 bg-white border-l border-gray-300 shadow-lg z-10 transform transition-all duration-500 ease-out ${
          selectedEvacuationCenter
            ? 'translate-x-0 opacity-100'
            : 'translate-x-full opacity-0'
        }`}
      >
        {selectedEvacuationCenter && (
          <EvacuationCenterSidebar
              selectedEvacuationCenter={selectedEvacuationCenter}
              setSelectedEvacuationCenter={setSelectedEvacuationCenter}
          />
        )}
      </div>
    </div>
  );
}