import React from "react";
import direction from '../../assets/direction.svg';

import type { EvacuationCenter } from '@/types/EvacuationCenter';

type Props = {
  selectedEvacuationCenter: EvacuationCenter;
  setSelectedEvacuationCenter: (center: EvacuationCenter | null) => void;
};

const EvacuationCenterSidebar: React.FC<Props> = ({ selectedEvacuationCenter, setSelectedEvacuationCenter }) => {
  return (
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
          <h3 className="text-sm text-gray-500">
            {selectedEvacuationCenter.address}, {selectedEvacuationCenter.barangay_name}
          </h3>
        </div>
      </div>

      <div className="mt-3 border-t-2 border-gray-200 py-3">
        <h3 className="text-sm text-gray-500">Evacuation Capacity:</h3>
        <div className="flex items-center gap-3 ps-3">
          <img src={direction} alt="" />
          <h3 className="text-sm font-bold">Capacity: 0/0</h3>
        </div>
      </div>

      <div>
        <h3 className="text-sm text-gray-500">Contact Information:</h3>
        <div className="flex items-center gap-3 ps-3">
          <img src={direction} alt="" />
          <div>
            <h3 className="text-sm font-bold">{selectedEvacuationCenter.camp_manager_name}</h3>
            <h3 className="text-sm font-bold">{selectedEvacuationCenter.camp_manager_phone_number}</h3>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 mb-3 py-3">
        <h3 className="text-sm text-gray-500">Evacuation Status:</h3>
        <div className="flex items-center gap-3 ps-3 py-1">
          <img src={direction} alt="" />
          <div className="bg-green-100 text-green-800 font-semibold px-2 text-sm rounded">
            {selectedEvacuationCenter.ec_status}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvacuationCenterSidebar;
