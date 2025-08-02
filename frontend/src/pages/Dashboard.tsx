import { usePageTitle } from '../hooks/usePageTitle';
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,} from "../components/ui/dropdown-menu";
import { useEffect, useState, useCallback } from 'react';
import { Input } from "../components/ui/input";
import { Calendar, ExternalLink } from "lucide-react";

import activeEC from '../assets/activeEC.svg';
import registeredEvacuees from '../assets/registeredEvacuees.svg';
import registeredFamilies from '../assets/registeredFamilies.svg';

import StatCard from '../components/StatCard';
import EvacueeStatisticsChart from '../components/EvacueeStatisticsChart';

// import { MapContainer, TileLayer} from 'react-leaflet';
// import 'leaflet/dist/leaflet.css';
// import { useNavigate } from 'react-router-dom';
// import GISMap from '../components/Map/GISMap';
// import type { EvacuationCenter } from '@/types/EvacuationCenter';

// export const EVACUEE_STATISTICS_DATA = [
//   { label: "Male", value: 120000 },
//   { label: "Female", value: 100000 },
//   { label: "Infant (<1 yr)", value: 10000 },
//   { label: "Children (2-12 yrs)", value: 40000 },
//   { label: "Youth (13-17 yrs)", value: 25000 },
//   { label: "Adult (18-59 yrs)", value: 90000 },
//   { label: "Senior Citizens (60+)", value: 30000 },
//   { label: "PWD", value: 8000 },
//   { label: "Pregnant Women", value: 5000 },
//   { label: "Lactating Women", value: 4000 },
// ];

// export const EVACUATION_CENTER_CAPACITY_DATA = [
//   { name: "Evacuation Center Name", brgy: "Brg. 1 - Name of Barangay", capacity: 90.1, current: 19783, total: 23000 },
//   { name: "Evacuation Center Name", brgy: "Brg. 1 - Name of Barangay", capacity: 89.4, current: 15783, total: 21000 },
//   { name: "Evacuation Center Name", brgy: "Brg. 1 - Name of Barangay", capacity: 88.3, current: 15526, total: 22000 },
//   { name: "Evacuation Center Name", brgy: "Brg. 1 - Name of Barangay", capacity: 74.1, current: 25235, total: 35000 },
//   { name: "Evacuation Center Name", brgy: "Brg. 1 - Name of Barangay", capacity: 49.4, current: 12456, total: 30000 },
// ];

export default function Dashboard() {
  usePageTitle('Dashboard');
  const [isEvacueeInfoModalOpen, setIsEvacueeInfoModalOpen] = useState(false);
  //const [selectedDisaster, setSelectedDisaster] = useState<string | null>(null);
  const [disasters, setDisasters] = useState<any[]>([]);
  const [selectedDisaster, setSelectedDisaster] = useState<{ id: number; disaster_name: string } | null>(null);
  const [activeEvacuationCenters, setActiveEvacuationCenters] = useState<number>(0);
  const [registeredEvacueesCount, setRegisteredEvacueesCount] = useState<number>(0);
  const [registeredFamiliesCount, setRegisteredFamiliesCount] = useState<number>(0);
  const [evacueeStatistics, setEvacueeStatistics] = useState<{ label: string; value: number }[]>([]);
  const [evacuationCapacityStatus, setEvacuationCapacityStatus] = useState<
    {
      id: number;
      name: string;
      barangay_name: string;
      current_occupancy: number;
      total_capacity: number;
    }[]
  >([]);
  // const navigate = useNavigate();
  // const [selectedEvacuationCenter, setSelectedEvacuationCenter] = useState<EvacuationCenter | null>(null);

  const handleCardClick = (disasterName: string) => {
    const disaster = disasters.find(d => d.disaster_name === disasterName);
    if (disaster) {
      setSelectedDisaster(disaster);
      setIsEvacueeInfoModalOpen(true);
    }
  };

  useEffect(() => {
    const fetchDisasters = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/v1/dashboard/disasters');
        const data = await res.json();
        setDisasters(data);
        setSelectedDisaster(data[0] || null); // Default to first disaster
      } catch (error) {
        console.error('Error fetching disasters:', error);
      }
    };

    fetchDisasters();
  }, []);

  useEffect(() => {
    const fetchActiveEvacuationCenters = async () => {
      if (!selectedDisaster?.id) return;

      try {
        const response = await fetch(`http://localhost:3000/api/v1/dashboard/active-evacuation-centers/${selectedDisaster.id}`);
        const result = await response.json();

        if (response.ok) {
          setActiveEvacuationCenters(result.count || 0);
        } else {
          console.error(result.message || 'Failed to fetch data.');
          setActiveEvacuationCenters(0);
        }
      } catch (error) {
        console.error('Error fetching active evacuation centers:', error);
        setActiveEvacuationCenters(0);
      }
    };

    fetchActiveEvacuationCenters();
  }, [selectedDisaster]);

  useEffect(() => {
    const fetchRegisteredEvacueesCount = async () => {
      if (!selectedDisaster?.id) return;

      try {
        const response = await fetch(`http://localhost:3000/api/v1/dashboard/registered-evacuees/${selectedDisaster.id}`);
        const result = await response.json();

        if (response.ok) {
          setRegisteredEvacueesCount(result.count || 0);
        } else {
          console.error(result.message || 'Failed to fetch registered evacuees.');
          setRegisteredEvacueesCount(0);
        }
      } catch (error) {
        console.error('Error fetching registered evacuees:', error);
        setRegisteredEvacueesCount(0);
      }
    };

    fetchRegisteredEvacueesCount();
  }, [selectedDisaster]);

  useEffect(() => {
    const fetchRegisteredFamiliesCount = async () => {
      if (!selectedDisaster?.id) return;

      try {
        const response = await fetch(`http://localhost:3000/api/v1/dashboard/registered-families/${selectedDisaster.id}`);
        const result = await response.json();

        if (response.ok) {
          setRegisteredFamiliesCount(result.count || 0);
        } else {
          console.error(result.message || 'Failed to fetch registered families.');
          setRegisteredFamiliesCount(0);
        }
      } catch (error) {
        console.error('Error fetching registered families:', error);
        setRegisteredFamiliesCount(0);
      }
    };

    fetchRegisteredFamiliesCount();
  }, [selectedDisaster]);

  useEffect(() => {
    const fetchEvacueeStatistics = async () => {
      if (!selectedDisaster?.id) return;

      try {
        const response = await fetch(`http://localhost:3000/api/v1/dashboard/evacuee-statistics/${selectedDisaster.id}`);
        const result = await response.json();

        if (response.ok) {
          const stats = result.statistics || {};

          const formattedStats = [
            { label: "Male", value: stats.total_no_of_male || 0 },
            { label: "Female", value: stats.total_no_of_female || 0 },
            { label: "Infant (<1 yr)", value: stats.total_no_of_infant || 0 },
            { label: "Children (2-12 yrs)", value: stats.total_no_of_children || 0 },
            { label: "Youth (13-17 yrs)", value: stats.total_no_of_youth || 0 },
            { label: "Adult (18-59 yrs)", value: stats.total_no_of_adult || 0 },
            { label: "Senior Citizens (60+)", value: stats.total_no_of_seniors || 0 },
            { label: "PWD", value: stats.total_no_of_pwd || 0 },
            { label: "Pregnant Women", value: stats.total_no_of_pregnant || 0 },
            { label: "Lactating Women", value: stats.total_no_of_lactating_women || 0 },
          ];

          setEvacueeStatistics(formattedStats);
        } else {
          console.error(result.message || 'Failed to fetch evacuee statistics.');
          setEvacueeStatistics([]);
        }
      } catch (error) {
        console.error('Error fetching evacuee statistics:', error);
        setEvacueeStatistics([]);
      }
    };

    fetchEvacueeStatistics();
  }, [selectedDisaster]);

  useEffect(() => {
    const fetchEvacuationCapacityStatus = async () => {
      if (!selectedDisaster?.id) return;

      try {
        const response = await fetch(
          `http://localhost:3000/api/v1/dashboard/capacity-status/${selectedDisaster.id}`
        );
        const result = await response.json();

        if (response.ok) {
          setEvacuationCapacityStatus(result.data || []);
        } else {
          console.error(result.message || 'Failed to fetch evacuation center capacity status.');
          setEvacuationCapacityStatus([]);
        }
      } catch (error) {
        console.error('Error fetching evacuation center capacity status:', error);
        setEvacuationCapacityStatus([]);
      }
    };

    fetchEvacuationCapacityStatus();
  }, [selectedDisaster]);

  return (
    <div className="text-black p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold text-green-800">Dashboard</h1>
        <div className="flex gap-2 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="text-green-700 border-green-300">
                {selectedDisaster?.disaster_name || 'Select Disaster'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {disasters.map(disaster => (
                <DropdownMenuItem
                  key={disaster.id}
                  onClick={() => setSelectedDisaster(disaster)}
                >
                  {disaster.disaster_name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500 pointer-events-none" />
            <Input
              readOnly
              value="01 April 2025 - 01 May 2025"
              className="pl-10 mr-7 cursor-default bg-white"
            />
          </div>
        </div>
      </div>

      {/* Map Placeholder */}
      <div className="w-full h-48 md:h-56 rounded-xl border overflow-hidden bg-gray-100 flex items-center justify-center">
        <span className="text-gray-400">[Map Placeholder]</span>
      </div>

      {/* Map Placeholder */}
      {/* <div className="relative w-full h-48 md:h-56 rounded-xl border overflow-hidden">
        <GISMap onMarkerClick={setSelectedEvacuationCenter} /> */}

        {/* Expand Button */}
        {/* <button
          onClick={() => navigate('/map')}
          className="absolute bottom-2 right-2 bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition z-[1000]"
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
      </div> */}

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
            <button className="p-1 rounded hover:bg-gray-100 transition" title="Export">
              <ExternalLink className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="w-full">
            <div className="grid grid-cols-2 font-semibold text-gray-700 text-sm border-b border-gray-100 pb-2 mb-2">
              <span>Name of Evacuation</span>
              <span>Capacity</span>
            </div>
            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto pr-2">
              {evacuationCapacityStatus.map((center, idx) => {
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
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}