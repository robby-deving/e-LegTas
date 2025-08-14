import { useState } from 'react';
import { usePageTitle } from '../hooks/usePageTitle';
import GISMap from '../components/Map/GISMap';
import EvacuationCenterSidebar from '../components/Map/EvacuationCenterSidebar';
import type { EvacuationCenter } from '@/types/EvacuationCenter';




export default function Map() {
  usePageTitle('Map');

  const [selectedEvacuationCenter, setSelectedEvacuationCenter] = useState<EvacuationCenter | null>(null);

  return (
    <div className="flex h-full overflow-hidden relative">
      <div className="flex-grow relative z-0">
        <GISMap onMarkerClick={setSelectedEvacuationCenter} />
      </div>
      
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
