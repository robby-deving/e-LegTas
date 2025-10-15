
import type { DateRange } from "react-day-picker";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import type {
  Disaster,
  CenterInfo,
} from '../types/dashboard';
import { useSelector } from 'react-redux';
import { selectToken } from '../features/auth/authSlice';

export function useBarangayDashboardData(barangayId: number, selectedDateRange?: DateRange) {
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [selectedDisaster, setSelectedDisaster] = useState<Disaster | null>(null);
  const [barangayInfo, setBarangayInfo] = useState<{ barangay: string }>({ barangay: "" });
  const [familiesCount, setFamiliesCount] = useState(0);
  const [evacueesCount, setEvacueesCount] = useState(0);
  const [familiesWithReliefGoodsCount, setFamiliesWithReliefGoodsCount] = useState(0);
  const [chartData, setChartData] = useState<{ label: string; value: number }[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const token = useSelector(selectToken);

  // Build headers with Authorization
  const getAuthHeaders = () => {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  // Step 1: Fetch Active Disasters
  useEffect(() => {
    const fetchDisasters = async () => {
      try {
        const headers = getAuthHeaders();
        const res = await fetch(
            `/api/v1/dashboard/barangay/disasters/${barangayId}`,
            { headers }
        );

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const json = await res.json();
        const data: Disaster[] = json.data || [];
        setDisasters(data);

        // auto-select only if none selected yet
        if (data.length > 0 && !selectedDisaster) {
          setSelectedDisaster(data[0]);
        }
      } catch (err) {
        console.error("Error fetching disasters:", err);
      }
    };

    if (barangayId) fetchDisasters();
  }, [barangayId]);

  // Step 2: Fetch Barangay Dashboard Data
  useEffect(() => {
    if (!selectedDisaster) {
        setFamiliesCount(0);
        setEvacueesCount(0);
        setFamiliesWithReliefGoodsCount(0);
        setChartData([]);
        return;
    }

    const fetchDashboard = async (isRealtimeUpdate = false) => {
      try {
        if (!isRealtimeUpdate) setLoading(true);
        let url = `/api/v1/dashboard/barangay/summary/${barangayId}?disasterId=${selectedDisaster.id}`;

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

          url += `&from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`;
        }

        const headers = getAuthHeaders();
        const res = await fetch(url, { headers });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const json = await res.json();
        const data = json || {};

        // Update state
        setBarangayInfo({ barangay: data.barangay?.name || "N/A" });
        setFamiliesCount(data.totals?.total_registered_families || 0);
        setEvacueesCount(data.totals?.total_registered_evacuees || 0);
        setFamiliesWithReliefGoodsCount(data.families_with_relief || 0);

        const stats = data.evacuee_stats || {};
        setChartData([
          { label: "Male", value: stats.male || 0 },
          { label: "Female", value: stats.female || 0 },
          { label: "Infant (<1 yr)", value: stats.infant || 0 },
          { label: "Children (2-12 yrs)", value: stats.children || 0 },
          { label: "Youth (13-17 yrs)", value: stats.youth || 0 },
          { label: "Adult (18-59 yrs)", value: stats.adult || 0 },
          { label: "Senior Citizens (60+)", value: stats.senior_citizens || 0 },
          { label: "PWD", value: stats.pwd || 0 },
          { label: "Pregnant Women", value: stats.pregnant || 0 },
          { label: "Lactating Women", value: stats.lactating || 0 },
        ]);
      } catch (err) {
        console.error("Error fetching barangay dashboard data:", err);
      } finally {
        if (!isRealtimeUpdate) setLoading(false);
      }
    };

    // If date filter applied => fetch once (no realtime)
    if (selectedDateRange?.from) {
      fetchDashboard();
      return;
    }

    fetchDashboard();

    // realtime updates
    const eventId = selectedDisaster.id;
    const channel = supabase.channel(`barangay-dashboard-${barangayId}-${eventId}`);

    // Listen for evacuee and family updates
    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "evacuation_summaries",
      },
      (payload) => {
        const oldRow = payload.old || {};
        const newRow = payload.new || {};

        const relevantFields = [
          "total_no_of_individuals",
          "total_no_of_families",
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

        const hasChange = relevantFields.some((f) => oldRow[f] !== newRow[f]);
        if (hasChange) {
          console.log("Relevant evacuee/family change → refetching dashboard");
          fetchDashboard(true);
        }
      }
    );

    // Listen for service changes (relief goods)
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "services",
      },
      async () => {
        console.log("Service table change → refetching dashboard");
        await fetchDashboard(true);
      }
    );

    // Listen for evacuee decampment (when evacuees leave)
    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "evacuation_registrations",
      },
      async (payload) => {
        const oldRow = payload.old;
        const newRow = payload.new;

        if (oldRow?.decampment_timestamp === null && newRow?.decampment_timestamp !== null) {
          console.log("Evacuee decamped → refetching dashboard");
          await fetchDashboard(true);
        }
      }
    );

    // Subscribe and cleanup
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };

  }, [barangayId, selectedDisaster, selectedDateRange]);

  return {
    disasters,
    selectedDisaster,
    setSelectedDisaster,
    barangayInfo,
    familiesCount,
    evacueesCount,
    familiesWithReliefGoodsCount,
    chartData,
    loading,
  };
}