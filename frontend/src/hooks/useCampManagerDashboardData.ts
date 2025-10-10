
import type { DateRange } from "react-day-picker";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  isEventLinkedToSelectedDisaster
} from '../services/dashboardService';
import type {
  Disaster,
  CenterInfo,
} from '../types/dashboard';
import { useSelector } from 'react-redux';
import { selectToken } from '../features/auth/authSlice';

export function useCampManagerDashboardData(campManagerId: number, selectedDateRange?: DateRange) {
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [selectedDisaster, setSelectedDisaster] = useState<Disaster | null>(null);
  const [centerInfo, setCenterInfo] = useState<CenterInfo | null>(null);
  const [familiesCount, setFamiliesCount] = useState(0);
  const [evacueesCount, setEvacueesCount] = useState(0);
  const [capacityCount, setCapacityCount] = useState(0);
  const [familiesWithReliefGoodsCount, setFamiliesWithReliefGoodsCount] = useState(0);
  const [chartData, setChartData] = useState<{ label: string; value: number }[]>([]);
  const [loading, setLoading] = useState(false);
  
  const token = useSelector(selectToken);

  // Get auth headers for API calls - using the same approach as UserManagement
  const getAuthHeaders = () => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    
    
    return headers;
  };

  useEffect(() => {
    const fetchDisasters = async () => {
      try {
        const headers = getAuthHeaders();
        const res = await fetch(
          `https://api.e-legtas.tech/api/v1/dashboard/camp-manager/disasters/${campManagerId}`,
          { headers }
        );
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data: Disaster[] = await res.json();

        setDisasters(data);

        // auto-select only if none selected yet
        if (data.length > 0 && !selectedDisaster) {
          setSelectedDisaster(data[0]);
        }
      } catch (err) {
        console.error("Error fetching camp manager disasters:", err);
      }
    };

    fetchDisasters();
  }, [campManagerId]);

  // Fetch center info when selectedDisaster changes
  useEffect(() => {
    const fetchCenterInfo = async () => {
      if (!selectedDisaster?.disaster_evacuation_event_id) {
        setCenterInfo(null);
        return;
      }

      setLoading(true);
      try {
        const headers = getAuthHeaders();
        const res = await fetch(
          `https://api.e-legtas.tech/api/v1/dashboard/camp-manager/center/${selectedDisaster.disaster_evacuation_event_id}`,
          { headers }
        );
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data: CenterInfo = await res.json();
        setCenterInfo(data);
      } catch (err) {
        console.error("Error fetching center info:", err);
      } finally {
        setLoading(false);  // stop loading
      }
    };

    fetchCenterInfo();
  }, [selectedDisaster]);

  // Fetch dashboard summary when disaster changes
  useEffect(() => {
    if (!selectedDisaster?.disaster_evacuation_event_id) {
      setFamiliesCount(0);
      setEvacueesCount(0);
      setCapacityCount(0);
      setFamiliesWithReliefGoodsCount(0);
      setChartData([]);
      return;
    }

    const eventId = selectedDisaster.disaster_evacuation_event_id;

    const fetchSummary = async () => {
      try {
        setLoading(true);

        // Build base URL
        let url = `/api/v1/dashboard/camp-manager/summary/${eventId}`;

        // If date filter applied, append from/to (Manila -> UTC ISO conversion)
        if (selectedDateRange?.from) {
          const timeZone = "Asia/Manila";

          // from: midnight Manila of selectedDateRange.from
          const fromUtc = new Date(
            selectedDateRange.from.toLocaleString("en-US", { timeZone })
          );
          fromUtc.setHours(0, 0, 0, 0);
          const fromIso = fromUtc.toISOString();

          // to: end of day Manila of selectedDateRange.to or same day if to is undefined
          const toDate = selectedDateRange?.to
            ? new Date(selectedDateRange.to.toLocaleString("en-US", { timeZone }))
            : new Date(selectedDateRange.from.toLocaleString("en-US", { timeZone }));
          toDate.setHours(23, 59, 59, 999);
          const toIso = toDate.toISOString();

          url += `?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`;
        }

        const headers = getAuthHeaders();
        const res = await fetch(url, { headers });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const json = await res.json();

        const data = json?.data ?? {};
        setFamiliesCount(data.registeredFamilies || 0);
        setEvacueesCount(data.registeredEvacuees || 0);
        setCapacityCount(data.ecCapacity || 0);
        setFamiliesWithReliefGoodsCount(data.totalFamiliesWithReliefGoods || 0);

        const stats = data.evacueeStatistics || {};
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
        setChartData(formattedStats);
      } catch (err) {
        console.error("Error fetching Camp Manager Dashboard Summary:", err);
      } finally {
        setLoading(false);
      }
    };

    // If date filter applied => fetch once (no realtime)
    if (selectedDateRange?.from) {
      fetchSummary();
      return;
    }

    // Live mode: fetch then subscribe (same channel approach you already used)
    fetchSummary();

    const channel = supabase.channel(`camp-manager-dashboard-${eventId}`);

    // Listener for evacuee & family counts (evacuation_summaries)
    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "evacuation_summaries",
        filter: `disaster_evacuation_event_id=eq.${eventId}`,
      },
      (payload) => {
        const oldRow = (payload.old || {}) as Record<string, any>;
        const newRow = (payload.new || {}) as Record<string, any>;

        const relevantFields = [
          "total_no_of_individuals",
          "total_no_of_families", // note: keep same field names you used previously
          "total_no_of_male",
          "total_no_of_female",
          "total_no_of_infant",
          "total_no_of_children",
          "total_no_of_youth",
          "total_no_of_adult",
          "total_no_of_seniors",
          "total_no_of_pwd",
          "total_no_of_pregnant",
          "total_no_of_lactating_women",
        ];

        const hasRelevantChange = relevantFields.some(
          (field) => oldRow[field] !== newRow[field]
        );

        if (hasRelevantChange) {
          console.log("Relevant evacuation_summaries change → refetching");
          fetchSummary();
        }
      }
    );

    // Listener for evacuation center capacity updates
    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "evacuation_centers",
      },
      async (payload) => {
        const oldRow = (payload.old || {}) as Record<string, any>;
        const newRow = (payload.new || {}) as Record<string, any>;

        const capacityChanged =
          newRow?.total_capacity !== oldRow?.total_capacity;
        if (!capacityChanged) return;

        // check relevancy
        const isRelevant = await isEventLinkedToSelectedDisaster(
          newRow.id,
          "center",
          selectedDisaster?.id
        );

        if (isRelevant) {
          console.log("Relevant evacuation_center capacity change → refetching");
          fetchSummary();
        }
      }
    );

    // When a new service is added, re-fetch dashboard
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "services",
        filter: `disaster_evacuation_event_id=eq.${eventId}`,
      },
      async (payload) => {
        console.log("New service added:", payload.new);
        await fetchSummary();
      }
    );

    // When an evacuee is updated, check for family decampment
    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "evacuation_registrations",
        filter: `disaster_evacuation_event_id=eq.${eventId}`,
      },
      async (payload) => {
        const oldRow = payload.old as Record<string, any>;
        const newRow = payload.new as Record<string, any>;

        // Only react when decampment_timestamp changes (evacuee leaves)
        if (
          oldRow.decampment_timestamp === null &&
          newRow.decampment_timestamp !== null
        ) {
          console.log("An evacuee decamped — rechecking active families");
          await fetchSummary();
        }
      }
    );

    // also handle deletions in `services`
    channel.on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "services",
        filter: `disaster_evacuation_event_id=eq.${eventId}`,
      },
      async (payload) => {
        console.log("Service record deleted:", payload.old);
        await fetchSummary();
      }
    );

    // Subscribe
    channel.subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDisaster, selectedDateRange]);

  return {
    disasters,
    selectedDisaster,
    setSelectedDisaster,
    centerInfo,
    familiesCount,
    evacueesCount,
    capacityCount,
    familiesWithReliefGoodsCount,
    chartData,
    loading,
  };
}

