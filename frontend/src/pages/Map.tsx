import { useState } from 'react';
import { usePageTitle } from '../hooks/usePageTitle';
import GISMap from '../components/GISMap';
import direction from '../assets/direction.svg';

type EvacuationCenter = {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  capacity_families: number;
};


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
          <div className="p-6 h-full overflow-y-auto">
            <button
              onClick={() => setSelectedEvacuationCenter(null)}
              className="hover:bg-gray-100 rounded-full transition-colors duration-200"
              aria-label="Close sidebar"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div>
              <h3 className="text-sm text-gray-500">Evacuation Center:</h3>
              <h1 className="text-2xl font-bold text-green-700">{selectedEvacuationCenter.name}</h1>
              <div className="flex items-center gap-2 mt-3">
                <img src={direction} alt="" />
                <h3 className="text-sm text-gray-500">{selectedEvacuationCenter.address}</h3>
              </div>
            </div>
            <div className="mt-3 border-t-2 border-gray-200 py-3">
              <h3 className="text-sm text-gray-500">Evacuation Center:</h3>
              <div className="flex items-center gap-3 ps-3">
                <img src={direction} alt="" />
                <h3 className="text-sm font-bold">Capacity : 0/{selectedEvacuationCenter.capacity_families}</h3>
              </div>
            </div>
            <div>
              <h3 className="text-sm text-gray-500">Contact Information:</h3>
              <div className="flex items-center gap-3 ps-3">
                <img src={direction} alt="" />
                <div>
                  <h3 className="text-sm font-bold">Juan Dela Cruz</h3>
                  <h3 className="text-sm font-bold">0987654321</h3>
                </div>
              </div>
            </div>
            <div className="border-b border-gray-200 mb-3 py-3">
              <h3 className="text-sm text-gray-500">Evacuation Status:</h3>
              <div className="flex items-center gap-3 ps-3 py-1">
                <img src={direction} alt="" />
                <div className="bg-green-100 text-green-800 font-semibold px-2 text-sm rounded">Normal</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
