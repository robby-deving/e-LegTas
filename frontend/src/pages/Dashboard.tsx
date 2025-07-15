import { usePageTitle } from '../hooks/usePageTitle';
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,} from "../components/ui/dropdown-menu";
import { Input } from "../components/ui/input";
import { Calendar } from "lucide-react";

import activeEC from '../assets/activeEC.svg';
import registeredEvacuees from '../assets/registeredEvacuees.svg';
import registeredFamilies from '../assets/registeredFamilies.svg';
import navigateTo from '../assets/navigateTo.svg';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
  if (!active || !payload || !payload.length) return null;
  const { value } = payload[0];
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-1.5 shadow border border-gray-200">
      <span className="text-gray-700 text-sm font-medium">{payload[0].payload.label}</span>
      <span className="ml-4 text-black text-sm font-bold">{Number(value).toLocaleString()}</span>
    </div>
  );
};

export default function Dashboard() {
  usePageTitle('Dashboard');
  const evacueeData = [
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
            <span className="text-2xl font-bold" style={{ color: "#FACF39" }}>78</span>
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
            <span className="text-2xl font-bold" style={{ color: "#0192D4" }}>  143</span>
          </CardContent>
        </Card>
      </div>

      {/* Main Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Evacuees Statistics */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Evacuees Statistics</CardTitle>
            <button className="p-1 rounded hover:bg-muted transition">
              <img src={navigateTo} alt="Go to details" className="w-4 h-4" />
            </button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={275}>
              <BarChart
                data={evacueeData}
                layout="vertical"
                margin={{ left: 0, right: 10, top: 0, bottom: 0 }}
                barCategoryGap={9}
              >
                {/* @ts-expect-error: YAxis is not a valid JSX component type due to type definitions */}
                <YAxis
                  dataKey="label"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={150}
                  tick={{ fontSize: 14, fill: "#888888" }} // green-700
                />
                {/* @ts-expect-error: XAxis is not a valid JSX component type due to type definitions */}
                <XAxis type="number" hide />
                <Tooltip content={CustomTooltip} cursor={false} />
                <Bar dataKey="value" fill="#16a34a" radius={8} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Evacuation Center Capacity Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Evacuation Center Capacity Status</CardTitle>
            <button className="p-1 rounded hover:bg-muted transition">
              <img src={navigateTo} alt="Go to details" className="w-4 h-4" />
            </button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: "Evacuation Center Name", brgy: "Brg. 1 - Name of Barangay", capacity: 90.1 },
                { name: "Evacuation Center Name", brgy: "Brg. 1 - Name of Barangay", capacity: 89.4 },
                { name: "Evacuation Center Name", brgy: "Brg. 1 - Name of Barangay", capacity: 88.3 },
                { name: "Evacuation Center Name", brgy: "Brg. 1 - Name of Barangay", capacity: 74.1 },
                { name: "Evacuation Center Name", brgy: "Brg. 1 - Name of Barangay", capacity: 49.4 },
                { name: "Evacuation Center Name", brgy: "Brg. 1 - Name of Barangay", capacity: 39.4 },
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