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

import { supabase } from '../lib/supabaseClient';

// This is for the display of GIS Map in dashboard
// import { MapContainer, TileLayer} from 'react-leaflet';
// import 'leaflet/dist/leaflet.css';
// import { useNavigate } from 'react-router-dom';
// import GISMap from '../components/Map/GISMap';
// import type { EvacuationCenter } from '@/types/EvacuationCenter';

// const formatDate = (dateString?: string | null) => {
//   if (!dateString) return '';
//   const date = new Date(dateString);
//   return new Intl.DateTimeFormat('en-PH', {
//     day: '2-digit',
//     month: 'long',
//     year: 'numeric',
//   }).format(date);
// };

type Disaster = {
  id: number;
  disaster_name: string;
  disaster_start_date: string | null;
  disaster_end_date: string | null;
  disaster_types?: {
    name: string;
  };
};

type DisasterEvacuationEvent = {
  evacuation_end_date: string | null;
};

type EvacuationSummary = {
  disaster_evacuation_event_id: number;
  total_no_of_individuals: number | null;
  total_no_of_family: number | null;
  total_no_of_male: number | null;
  total_no_of_female: number | null;
  total_no_of_infant: number | null;
  total_no_of_children: number | null;
  total_no_of_youth: number | null;
  total_no_of_adult: number | null;
  total_no_of_seniors: number | null;
  total_no_of_pwd: number | null;
  total_no_of_pregnant: number | null;
  total_no_of_lactating_women: number | null;
};

export default function Dashboard() {
  usePageTitle('Dashboard');
  const [isEvacueeInfoModalOpen, setIsEvacueeInfoModalOpen] = useState(false);
  //const [selectedDisaster, setSelectedDisaster] = useState<string | null>(null);
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [selectedDisaster, setSelectedDisaster] = useState<Disaster | null>(null);
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

  useEffect(() => {
    const fetchDisasters = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/v1/dashboard/disasters');
        const data: Disaster[] = await res.json();
        setDisasters(data);

        // If the current selection is gone or null, reset it
        if (!selectedDisaster || !data.some(d => d.id === selectedDisaster.id)) {
          setSelectedDisaster(data[0] || null);
        }
      } catch (error) {
        console.error('Error fetching disasters:', error);
      }
    };

    fetchDisasters();

    const channel = supabase
      .channel('realtime-active-disasters')
      .on(
        'postgres_changes',
        {
          event: '*', // listen to insert, update, delete
          schema: 'public',
          table: 'disasters',
        },
        (payload) => {
          console.log('Realtime disaster change detected:', payload);
          fetchDisasters();
        }
      )
      .subscribe();

    // Cleanup when component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDisaster]);

  // Helper function to Listen for evacuation_summaries changes
  function listenToEvacuationSummaryChange(
    channel: ReturnType<typeof supabase.channel>,
    selectedDisasterId: number | undefined,
    checkChanged: (newData: any, oldData: any) => boolean,
    onChange: () => void,
    label: string
  ) {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'evacuation_summaries',
      },
      async (payload) => {
        const newData = payload.new as EvacuationSummary;
        const oldData = payload.old as EvacuationSummary;

        const hasChanged = checkChanged(newData, oldData);
        if (!hasChanged) {
          console.log(`${label}: no relevant change — skipping`);
          return;
        }

        const isRelevant = await isEventLinkedToSelectedDisaster(
          newData?.disaster_evacuation_event_id,
          'event'
        );

        if (isRelevant) {
          console.log(`${label}: relevant change detected — refetching`);
          onChange();
        } else {
          console.log(`${label}: unrelated to selected disaster — skipping`);
        }
      }
    );
  }

  // Helper function to Listen for evacuation_end_date changes
  function listenToEvacuationEndDateChange(
    channel: ReturnType<typeof supabase.channel>,
    selectedDisasterId: number | undefined,
    onChange: () => void,
    label: string
  ) {
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'disaster_evacuation_event',
      },
      (payload) => {
        const newData = payload.new;
        const oldData = payload.old;

        const oldEndDate = oldData?.evacuation_end_date;
        const newEndDate = newData?.evacuation_end_date;

        const endDateChanged =
          oldEndDate !== newEndDate && newData?.disaster_id === selectedDisasterId;

        if (endDateChanged) {
          console.log(`${label}: evacuation_end_date changed — refetching`);
          onChange();
        } else {
          console.log(`${label}: no relevant end_date change — skipping`);
        }
      }
    );
  }

  // Helper function for only fetching data if it is linked to the selected disaster
  const isEventLinkedToSelectedDisaster = async (
    eventIdOrCenterId: number,
    mode: 'event' | 'center'
  ): Promise<boolean> => {
    if (!selectedDisaster?.id) return false;

    if (mode === 'event') {
      const { data, error } = await supabase
        .from('disaster_evacuation_event')
        .select('disaster_id')
        .eq('id', eventIdOrCenterId)
        .single();

      if (error || !data) return false;
      return data.disaster_id === selectedDisaster.id;
    }

    if (mode === 'center') {
      const { data, error } = await supabase
        .from('disaster_evacuation_event')
        .select('id')
        .eq('evacuation_center_id', eventIdOrCenterId)
        .eq('disaster_id', selectedDisaster.id)
        .is('evacuation_end_date', null);

      if (error || !data) return false;
      return data.length > 0;
    }

    return false;
  };

  // Active Evacuation Centers Count
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

    // Subscribe to realtime updates
    const channel = supabase
      .channel('realtime-active-ec')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'disaster_evacuation_event',
          filter: `disaster_id=eq.${selectedDisaster?.id}`
        },
        (payload) => {
          const oldData = payload.old as DisasterEvacuationEvent;
          const newData = payload.new as DisasterEvacuationEvent;

          if (!oldData && newData?.evacuation_end_date === null) {
            console.log('New active evacuation event inserted → refetching...');
            fetchActiveEvacuationCenters();
            return;
          }

          if (oldData && !newData) {
            console.log('Evacuation event deleted → refetching...');
            fetchActiveEvacuationCenters();
            return;
          }

          if (
            oldData?.evacuation_end_date !== newData?.evacuation_end_date
          ) {
            console.log('evacuation_end_date changed, refetching...');
            fetchActiveEvacuationCenters();
            return;
          }

          console.log('No relevant change — skipping refetch.');
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDisaster]); // rerun if selected disaster changes

  // Registered Evacuees Count
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

    const channel = supabase.channel('realtime-evacuee-triggers')
    
    // (1) Listen for total_no_of_individual updates on the evacuation_summaries table
    listenToEvacuationSummaryChange(
      channel,
      selectedDisaster?.id,
      (newData, oldData) => newData?.total_no_of_individuals !== oldData?.total_no_of_individuals,
      fetchRegisteredEvacueesCount,
      'Evacuees'
    );
 
    // (2) Listen for evacuation_end_date changes
    listenToEvacuationEndDateChange(
      channel,
      selectedDisaster?.id,
      fetchRegisteredEvacueesCount,
      'Evacuees'
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDisaster]);

  // Registered Families Count
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

    const channel = supabase.channel('realtime-family-triggers')

      // (1) Listen for total_no_of_family changes in evacuation_summaries
      listenToEvacuationSummaryChange(
        channel,
        selectedDisaster?.id,
        (newData, oldData) => newData?.total_no_of_family !== oldData?.total_no_of_family,
        fetchRegisteredFamiliesCount,
        'Families'
      );

      // (2) Listen for evacuation_end_date changes
      listenToEvacuationEndDateChange(
        channel, 
        selectedDisaster?.id, 
        fetchRegisteredFamiliesCount, 
        'Families'
      );

      channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDisaster]);

  // Evacuees Statistics Count
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

    const channel = supabase.channel('realtime-evacuee-statistics')
    
    // (1) Setup Realtime subscription to evacuation_summaries
    listenToEvacuationSummaryChange(
      channel,
      selectedDisaster?.id,
      (newData, oldData) =>
        newData?.total_no_of_male !== oldData?.total_no_of_male ||
        newData?.total_no_of_female !== oldData?.total_no_of_female ||
        newData?.total_no_of_infant !== oldData?.total_no_of_infant ||
        newData?.total_no_of_children !== oldData?.total_no_of_children ||
        newData?.total_no_of_youth !== oldData?.total_no_of_youth ||
        newData?.total_no_of_adult !== oldData?.total_no_of_adult ||
        newData?.total_no_of_seniors !== oldData?.total_no_of_seniors ||
        newData?.total_no_of_pwd !== oldData?.total_no_of_pwd ||
        newData?.total_no_of_pregnant !== oldData?.total_no_of_pregnant ||
        newData?.total_no_of_lactating_women !== oldData?.total_no_of_lactating_women,
      fetchEvacueeStatistics,
      'Evacuee Stats'
    );

    // (2) Listen for evacuation_end_date changes
    listenToEvacuationEndDateChange(
      channel, 
      selectedDisaster?.id, 
      fetchEvacueeStatistics, 
      'Evacuee Stats'
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDisaster]);

  // Evacuation Capacity Status
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

    // Realtime listener for evacuee registration updates
    const channel = supabase.channel('realtime-evacuation-center-capacity');

    // (1) Listen to changes in evacuation_summaries
    listenToEvacuationSummaryChange(
      channel,
      selectedDisaster?.id,
      (newData, oldData) => newData?.total_no_of_individuals !== oldData?.total_no_of_individuals,
      fetchEvacuationCapacityStatus,
      'Evacuation Capacity'
    );

    // (2) Listen to changes in evacuation_centers
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'evacuation_centers',
      },
      async (payload) => {
        const newData = payload.new;
        const oldData = payload.old;

        const capacityChanged = newData?.total_capacity !== oldData?.total_capacity;
        if (!capacityChanged) return;

        const isRelevant = await isEventLinkedToSelectedDisaster(
          newData.id,
          'center'
        );

        if (isRelevant) {
          console.log('Relevant evacuation_center capacity change → refetching');
          fetchEvacuationCapacityStatus();
        }
      }
    );

    // (3) Listen to updates in disaster_evacuation_event (evacuation_end_date changed)
    listenToEvacuationEndDateChange(
      channel, 
      selectedDisaster?.id, 
      fetchEvacuationCapacityStatus, 
      'Capacity Status'
    );

    // (4) Listen to new rows inserted in disaster_evacuation_event
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'disaster_evacuation_event',
      },
      (payload) => {
        const inserted = payload.new;
        if (inserted?.disaster_id === selectedDisaster?.id && inserted?.evacuation_end_date === null) {
          console.log('New active evacuation event inserted');
          fetchEvacuationCapacityStatus();
        }
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
              {/* <Input
                readOnly
                value={
                  selectedDisaster
                    ? `Start Date: ${formatDate(selectedDisaster.disaster_start_date)}`
                    : 'Select Disaster'
                }
                className="pl-10 mr-7 cursor-default bg-white"
              /> */}
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
    </div>
  );
}