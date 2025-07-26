import { usePageTitle } from '../hooks/usePageTitle';
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,} from "../components/ui/dropdown-menu";
import { useState } from 'react';
import { Input } from "../components/ui/input";
import { Calendar, ExternalLink } from "lucide-react";

import activeEC from '../assets/activeEC.svg';
import registeredEvacuees from '../assets/registeredEvacuees.svg';
import registeredFamilies from '../assets/registeredFamilies.svg';

import StatCard from '../components/StatCard';
import EvacueeStatisticsChart from '../components/EvacueeStatisticsChart';

export const EVACUEE_STATISTICS_DATA = [
  { label: "Male", value: 120000 },
  { label: "Female", value: 100000 },
  { label: "Infant (<1 yr)", value: 10000 },
  { label: "Children (2-12 yrs)", value: 40000 },
  { label: "Youth (13-17 yrs)", value: 25000 },
  { label: "Adult (18-59 yrs)", value: 90000 },
  { label: "Senior Citizens (60+)", value: 30000 },
  { label: "PWD", value: 8000 },
  { label: "Pregnant Women", value: 5000 },
  { label: "Lactating Women", value: 4000 },
];

export const EVACUATION_CENTER_CAPACITY_DATA = [
  { name: "Evacuation Center Name", brgy: "Brg. 1 - Name of Barangay", capacity: 90.1, current: 19783, total: 23000 },
  { name: "Evacuation Center Name", brgy: "Brg. 1 - Name of Barangay", capacity: 89.4, current: 15783, total: 21000 },
  { name: "Evacuation Center Name", brgy: "Brg. 1 - Name of Barangay", capacity: 88.3, current: 15526, total: 22000 },
  { name: "Evacuation Center Name", brgy: "Brg. 1 - Name of Barangay", capacity: 74.1, current: 25235, total: 35000 },
  { name: "Evacuation Center Name", brgy: "Brg. 1 - Name of Barangay", capacity: 49.4, current: 12456, total: 30000 },
];

export default function Dashboard() {
  usePageTitle('Dashboard');
  const [isEvacueeInfoModalOpen, setIsEvacueeInfoModalOpen] = useState(false);
  const [selectedDisaster, setSelectedDisaster] = useState<string | null>(null);

  const handleCardClick = (disasterName: string) => {
    setSelectedDisaster(disasterName);
    setIsEvacueeInfoModalOpen(true);
  };

  return (
    <div className="text-black p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold text-green-800">Dashboard</h1>
        <div className="flex gap-2 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="text-green-700 border-green-300">Typhoon Kristine</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem>Typhoon Kristine</DropdownMenuItem>
              <DropdownMenuItem>Typhoon Odette</DropdownMenuItem>
              <DropdownMenuItem>Typhoon Yolanda</DropdownMenuItem>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Active Evacuation Centers"
          value={5}
          icon={<img src={activeEC} alt="Evacuation Center" className="w-6 h-6 text-sky-600" />}
          valueClassName="text-yellow-400"
          onClick={() => handleCardClick('Active Evacuation Centers')}
        />
        <StatCard
          title="Registered Evacuees"
          value="200,143"
          icon={<img src={registeredEvacuees} alt="Registered Evacuees" className="w-6 h-6 text-green-600" />}
          valueClassName="text-green-600"
          onClick={() => handleCardClick('Registered Evacuees')}
        />
        <StatCard
          title="Registered Families"
          value={143}
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
            <EvacueeStatisticsChart data={EVACUEE_STATISTICS_DATA} height={275} />
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
            <div className="divide-y divide-gray-100">
              {EVACUATION_CENTER_CAPACITY_DATA.map((center, idx) => (
                <div key={idx} className="grid grid-cols-2 py-2 items-center">
                  <div>
                    <div className="font-medium text-sm">{center.name}</div>
                    <div className="text-xs text-gray-500">{center.brgy}</div>
                  </div>
                  <span className={`font-bold text-sm ${center.capacity > 80 ? 'text-red-500' : center.capacity > 70 ? 'text-yellow-500' : 'text-green-600'}`}>{center.current.toLocaleString()} / {center.total.toLocaleString()} <span className="ml-1">({center.capacity}%)</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}