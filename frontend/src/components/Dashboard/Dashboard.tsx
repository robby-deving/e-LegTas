import { usePageTitle } from '../../hooks/usePageTitle';
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,} from "../../components/ui/dropdown-menu";
import { useEffect, useState, useCallback } from 'react';
import { Input } from "../../components/ui/input";
import { Calendar, ExternalLink } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import activeEC from '../../assets/activeEC.svg';
import registeredEvacuees from '../../assets/registeredEvacuees.svg';
import registeredFamilies from '../../assets/registeredFamilies.svg';
import GISMap from '../Map/GISMap';

import StatCard from '../../components/StatCard';
import EvacueeStatisticsChart from '../../components/EvacueeStatisticsChart';

import { supabase } from '../../lib/supabaseClient';
import { useDashboardData } from '../../hooks/useDashboardData';
import { usePermissions } from '../../contexts/PermissionContext';

import { Popover, PopoverTrigger, PopoverContent } from "../../components/ui/popover";
import { Calendar as DateCalendar } from "../../components/ui/calendar";
import type { DateRange } from "react-day-picker";
import { Calendar as CalendarIcon } from "lucide-react";

import DashboardHeader from "./DashboardHeader";

// This is for the display of GIS Map in dashboard
// import { MapContainer, TileLayer} from 'react-leaflet';
// import 'leaflet/dist/leaflet.css';
// import { useNavigate } from 'react-router-dom';
// import GISMap from '../components/Map/GISMap';
// import type { EvacuationCenter } from '@/types/EvacuationCenter';

export default function Dashboard() {
  usePageTitle('Dashboard');
  const { hasPermission } = usePermissions();
  const canViewMap = hasPermission('view_map');
  const [isEvacueeInfoModalOpen, setIsEvacueeInfoModalOpen] = useState(false);
  const navigate = useNavigate();
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedEvacuationCenter, setSelectedEvacuationCenter] = useState<EvacuationCenter | null>(null);
  const { 
    disasters, 
    selectedDisaster, 
    setSelectedDisaster, 
    activeEvacuationCenters, 
    registeredEvacueesCount,
    registeredFamiliesCount,
    evacueeStatistics,
    evacuationCapacityStatus,
    loading, } = useDashboardData(selectedDateRange);

  const fromDate = selectedDisaster?.disaster_start_date
    ? new Date(selectedDisaster.disaster_start_date)
    : undefined;

  const toDate = new Date(); // today

  // This is for the display of GIS Map in dashboard
  // const navigate = useNavigate();
  // const [selectedEvacuationCenter, setSelectedEvacuationCenter] = useState<EvacuationCenter | null>(null);

  const handleCardClick = (disasterName: string) => {
    const disaster = disasters.find(d => d.disaster_name === disasterName);
    if (disaster) {
      setSelectedDisaster(disaster);
      setIsEvacueeInfoModalOpen(true);
    }
  };

  return (
    <div className="text-black p-6 space-y-6">
      {/* Header */}
      <DashboardHeader
        disasters={disasters}
        selectedDisaster={selectedDisaster}
        setSelectedDisaster={setSelectedDisaster}
        selectedDateRange={selectedDateRange}
        setSelectedDateRange={setSelectedDateRange}
        fromDate={fromDate}
        toDate={toDate}
      />

    {loading ? (
      <div className="flex items-center justify-center h-64">
        <p className="text-lg text-gray-500">Loading dashboard data...</p>
      </div>
    ) : selectedDisaster ? (
      <>

{canViewMap && (
  <div className="relative w-full h-48 md:h-56 rounded-xl border overflow-hidden bg-gray-100 flex items-center justify-center z-0">
    <GISMap onMarkerClick={setSelectedEvacuationCenter} height="100%" />
    
    {/* Expand Button */}
    <button
      onClick={() => navigate('/map')}
      className="absolute bottom-2 right-2 bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition z-50"
      title="Expand GIS Map"
    >
      <svg
        className="w-5 h-5 text-gray-600"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 4h4v4m0-4l-7 7M8 20H4v-4m0 4l7-7" />
      </svg>
    </button>
  </div>
)}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Active Evacuation Centers"
          value={activeEvacuationCenters}
          icon={<img src={activeEC} alt="Evacuation Center" className="w-6 h-6 text-sky-600" />}
          valueClassName="text-yellow-400"
          onClick={() => handleCardClick('Active Evacuation Centers')}
        />
        <StatCard
          title="Registered Evacuees"
          value={registeredEvacueesCount.toLocaleString()}
          icon={<img src={registeredEvacuees} alt="Registered Evacuees" className="w-6 h-6 text-green-600" />}
          valueClassName="text-green-600"
          onClick={() => handleCardClick('Registered Evacuees')}
        />
        <StatCard
          title="Registered Families"
          value={registeredFamiliesCount.toLocaleString()}
          icon={<img src={registeredFamilies} alt="Registered Families" className="w-6 h-6 text-blue-600" />}
          valueClassName="text-blue-500"
          onClick={() => handleCardClick('Registered Families')}
        />
      </div>

      {/* Main Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Evacuees Statistics */}
        <div className="border border-gray-200 rounded-xl shadow-sm p-6 flex flex-col min-h-[400px]">
          <h2 className="text-lg font-bold mb-4 text-left">Evacuees Statistics</h2>
          <div className="flex-1 flex items-center justify-center">
            <EvacueeStatisticsChart data={evacueeStatistics} height={275} />
          </div>
        </div>

        {/* Evacuation Center Capacity Status */}
        <div className="border border-gray-200 rounded-xl shadow-sm p-6 min-h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-left">Evacuation Center Capacity Status</h2>
            <button className="p-1 rounded hover:bg-gray-100 transition cursor-pointer" title="Expand">
              <ExternalLink className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="w-full">
            <div className="grid grid-cols-2 font-semibold text-gray-700 text-sm border-b border-gray-100 pb-2 mb-2">
              <span>Name of Evacuation</span>
              <span>Capacity</span>
            </div>
            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto pr-2">
              {evacuationCapacityStatus.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-4">
                  No Active Evacuation Centers
                </div>
              ) : (
              evacuationCapacityStatus.map((center, idx) => {
                const capacityPercentage =
                  center.total_capacity === 0
                    ? 0
                    : Math.round((center.current_occupancy / center.total_capacity) * 1000) / 10;

                return (
                  <div key={idx} className="grid grid-cols-2 py-2 items-center">
                    <div>
                      <div className="font-medium text-sm">{center.name}</div>
                      <div className="text-xs text-gray-500">{center.barangay_name}</div>
                    </div>
                    <span
                      className={`font-bold text-sm ${
                        capacityPercentage > 80
                          ? 'text-red-500'
                          : capacityPercentage > 70
                          ? 'text-yellow-500'
                          : 'text-green-600'
                      }`}
                    >
                      {center.current_occupancy.toLocaleString()} / {center.total_capacity.toLocaleString()}{' '}
                      <span className="ml-1">({capacityPercentage}%)</span>
                    </span>
                  </div>
                );
              })
              )}
            </div>
          </div>
        </div>
      </div>
      </>
      ) : (
        // Message if no active disaster
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center justify-center h-[400px] text-center">
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              No Ongoing Disaster
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl">
              Please record or activate a disaster to view dashboard data.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}