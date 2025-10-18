import { useState, useCallback, useEffect } from 'react';
import { usePageTitle } from '../hooks/usePageTitle';
import GISMap from '../components/Map/GISMap';
import EvacuationCenterSidebar from '../components/Map/EvacuationCenterSidebar';
import MapStatusIndicator from '../components/Map/MapStatusIndicator';
import MapSearch from '../components/Map/MapSearch';
import type { EvacuationCenter } from '@/types/EvacuationCenter';




export default function Map() {
  usePageTitle('Map');

  const [selectedEvacuationCenter, setSelectedEvacuationCenter] = useState<EvacuationCenter | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [evacuationCenters, setEvacuationCenters] = useState<EvacuationCenter[]>([]);
  const [filteredEvacuationCenters, setFilteredEvacuationCenters] = useState<EvacuationCenter[]>([]);

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

  const handleEvacuationCentersChange = useCallback((centers: EvacuationCenter[]) => {
    setEvacuationCenters(centers);
    setFilteredEvacuationCenters(centers); // Initialize filtered centers with all centers
  }, []);

  const handleFilteredCentersChange = useCallback((centers: EvacuationCenter[]) => {
    setFilteredEvacuationCenters(centers);
  }, []);

  const handleCenterOnMap = useCallback((center: EvacuationCenter) => {
    // Close any open sidebar first
    setSelectedEvacuationCenter(null);

    // Use the map reference to center on the selected evacuation center
    if (typeof window !== 'undefined' && (window as any).gisMapRef) {
      const map = (window as any).gisMapRef;
      map.flyTo([center.latitude, center.longitude], 17, {
        animate: true,
        duration: 1.5,
      });

      // Also trigger the marker click to show the sidebar
      setTimeout(() => {
        setSelectedEvacuationCenter(center);
      }, 500);
    }
  }, []);

  // Reset filtered centers when search query is cleared
  useEffect(() => {
    if (!searchQuery.trim() && evacuationCenters.length > 0) {
      setFilteredEvacuationCenters(evacuationCenters);
    }
  }, [searchQuery, evacuationCenters]);

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* Floating search component in upper left */}
      <div className="absolute top-4 left-4 z-20 w-80">
        <MapSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          evacuationCenters={filteredEvacuationCenters}
          onCenterOnMap={handleCenterOnMap}
        />
      </div>

      <div className="flex-grow relative z-0">
        <GISMap
          onMarkerClick={setSelectedEvacuationCenter}
          onLastUpdatedChange={handleLastUpdatedChange}
          searchQuery={searchQuery}
          onEvacuationCentersChange={handleEvacuationCentersChange}
          onFilteredCentersChange={handleFilteredCentersChange}
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