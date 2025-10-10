import { usePageTitle } from '../../hooks/usePageTitle';
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { useState } from 'react';
import { Calendar } from "lucide-react";
import EvacueeStatisticsChart from '../../components/EvacueeStatisticsChart';
import { useCampManagerDashboardData } from '../../hooks/useCampManagerDashboardData';
import type { DateRange } from "react-day-picker";
import DashboardHeader from "./DashboardHeader";
import { getTypeColor, getTagColor } from "@/constants/disasterTypeColors";
import { formatDate } from "@/utils/dateFormatter";
import { EvacuationCenterNameCard } from "../../components/cards/EvacuationCenterNameCard";
import { RegisteredFamiliesCard } from "../../components/cards/RegisteredFamiliesCard";
import { RegisteredEvacueesCard } from "../../components/cards/RegisteredEvacueesCard";
import { ECCapacityCard } from "../../components/cards/ECCapacityCard";
import { ReliefGoodsCard } from "../../components/cards/ReliefGoodsCard";
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../features/auth/authSlice';

export default function CampManagerDashboard() {
  usePageTitle('CampManagerDashboard');
  const currentUser = useSelector(selectCurrentUser);
  
  // Use the actual authenticated user's ID instead of hardcoded value
  const campManagerId = currentUser?.user_id;

  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);



  // Don't fetch data if we don't have a valid camp manager ID
  if (!campManagerId) {
    return (
      <div className="text-black p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              User ID Not Found
            </h2>
            <p className="text-lg text-gray-500">
              Unable to load dashboard data. Please contact your administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { 
    disasters, 
    selectedDisaster, 
    setSelectedDisaster,
    centerInfo,
    familiesCount,
    evacueesCount,
    capacityCount,
    familiesWithReliefGoodsCount,
    chartData,
    loading,  } = useCampManagerDashboardData(campManagerId, selectedDateRange);

  const fromDate = selectedDisaster?.disaster_start_date
    ? new Date(selectedDisaster.disaster_start_date)
    : undefined;

  const toDate = new Date(); // today

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
      {/* Disaster Information Card */}
      <div className="py-3">
        <div className="space-y-3">
          <div
            className={`inline-block rounded px-3 py-1 text-sm font-semibold ${getTagColor(
              selectedDisaster?.disaster_types?.name || "default"
            )}`}
          >
            {selectedDisaster?.disaster_types?.name}
          </div>
          <h2 
            className={`text-3xl font-bold ${getTypeColor(
              selectedDisaster?.disaster_types?.name || "default"
            )}`}
          >
            {selectedDisaster?.disaster_name}
          </h2>
          {selectedDisaster?.disaster_start_date && (
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">
                {formatDate(selectedDisaster.disaster_start_date)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Center Summary & Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="md:col-span-1">
          <EvacuationCenterNameCard
            name={centerInfo?.name || "Loading..."}
            barangay={centerInfo?.barangay || ""}
          />
          <div className="flex flex-col gap-6 mt-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RegisteredFamiliesCard count={familiesCount} />
              <RegisteredEvacueesCard count={evacueesCount} />
              <ECCapacityCard count={capacityCount} />
              <ReliefGoodsCard count={familiesWithReliefGoodsCount} />
            </div>
          </div>
        </div>
        <Card className="md:col-span-1 shadow-sm border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold leading-tight mb-0">
              Evacuees Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EvacueeStatisticsChart data={chartData} />
          </CardContent>
        </Card>
      </div>
    </>
      ) : (
        // Message if no active disaster
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center justify-center h-[400px] text-center">
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              No Ongoing Incident
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl">
              Please activate an Evacuation Center to view dashboard data.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}