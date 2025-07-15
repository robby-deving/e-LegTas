import { usePageTitle } from '../hooks/usePageTitle';
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,} from "../components/ui/dropdown-menu";
import { Input } from "../components/ui/input";
import { Calendar } from "lucide-react";

import activeEC from '../assets/activeEC.svg';
import registeredEvacuees from '../assets/registeredEvacuees.svg';
import registeredFamilies from '../assets/registeredFamilies.svg';

export default function Dashboard() {
  usePageTitle('Dashboard');
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
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
            <Input
              readOnly
              value="01 April 2025 - 01 May 2025"
              className="pl-10 mr-6 cursor-default bg-white"
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              Total Evacuation Centers
              <span className="ml-auto text-yellow-500">
                <img src={activeEC} alt="Evacuation Center" className="w-6 h-6" />
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-yellow-600">78</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
                Registered Evacuees 
                <span className="ml-auto text-green-600">
                <img src={registeredEvacuees} alt="Evacuation Center" className="w-6 h-6" />
                </span></CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-green-600">200,143</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
                Registered Families 
                <span className="ml-auto text-blue-600">
                    <img src={registeredFamilies} alt="Evacuation Center" className="w-6 h-6" />
                </span></CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-blue-600">143</span>
          </CardContent>
        </Card>
      </div>

      {/* Main Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Evacuees Statistics */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Evacuees Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Bar chart style stats */}
            <div className="space-y-2">
              {[
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
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-2">
                  <span className="w-40 text-xs text-gray-700">{stat.label}</span>
                  <div className="flex-1 bg-gray-200 rounded h-3 overflow-hidden">
                    <div
                      className="bg-green-600 h-3 rounded-full"
                      style={{ width: `${Math.min(stat.value / 200000 * 100, 100)}%` }}
                    ></div>
                  </div>
                  <span className="w-16 text-xs text-right text-gray-600">{stat.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Evacuation Center Capacity Status */}
        <Card>
          <CardHeader>
            <CardTitle>Evacuation Center Capacity Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { name: "Evacuation Center Name", brgy: "Brg. 1 - Name of Barangay", capacity: 90.1 },
                { name: "Evacuation Center Name", brgy: "Brg. 1 - Name of Barangay", capacity: 89.4 },
                { name: "Evacuation Center Name", brgy: "Brg. 1 - Name of Barangay", capacity: 88.3 },
                { name: "Evacuation Center Name", brgy: "Brg. 1 - Name of Barangay", capacity: 74.1 },
                { name: "Evacuation Center Name", brgy: "Brg. 1 - Name of Barangay", capacity: 49.4 },
              ].map((center, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{center.name}</div>
                    <div className="text-xs text-gray-500">{center.brgy}</div>
                  </div>
                  <span className={`font-bold text-sm ${center.capacity > 80 ? 'text-red-500' : center.capacity > 70 ? 'text-yellow-500' : 'text-green-600'}`}>{center.capacity}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}