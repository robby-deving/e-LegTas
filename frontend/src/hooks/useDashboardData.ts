import { RealtimeChannel } from "@supabase/supabase-js";
import type { DateRange } from "react-day-picker";
import { useEffect, useState } from "react";
import { useSelector } from 'react-redux';
import { selectToken } from '../features/auth/authSlice';
import { supabase } from "../lib/supabaseClient";
import {
  listenToEvacuationSummaryChange,
  listenToEvacuationEndDateChange,
  isEventLinkedToSelectedDisaster
} from '../services/dashboardService';
import type {
  Disaster,
} from '../types/dashboard';

export function useDashboardData(selectedDateRange?: DateRange) {
  const token = useSelector(selectToken);
  const [effectiveToken, setEffectiveToken] = useState<string>('');

  // Resolve a valid access token from Redux → storage → Supabase session
  useEffect(() => {
    let isMounted = true;
    const resolveToken = async () => {
      // 1) Redux
      if (token) {
        if (isMounted) setEffectiveToken(token);
        return;
      }
      // 2) Storage
      const stored =
        (typeof window !== 'undefined' && (localStorage.getItem('authToken') || sessionStorage.getItem('authToken'))) ||
        '';
      if (stored) {
        if (isMounted) setEffectiveToken(stored);
        return;
      }
      // 3) Supabase session
      try {
        const { data } = await supabase.auth.getSession();
        const supaToken = data?.session?.access_token || '';
        if (supaToken && isMounted) setEffectiveToken(supaToken);
      } catch {}
    };
    resolveToken();
    return () => { isMounted = false; };
  }, [token]);
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [selectedDisaster, setSelectedDisaster] = useState<Disaster | null>(null);
  const [activeEvacuationCenters, setActiveEvacuationCenters] = useState<number>(0);
  const [registeredEvacueesCount, setRegisteredEvacueesCount] = useState<number>(0);
  const [registeredFamiliesCount, setRegisteredFamiliesCount] = useState<number>(0);
  const [familiesWithReliefGoodsCount, setFamiliesWithReliefGoodsCount] = useState<number>(0);
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
  const [loading, setLoading] = useState(false);

  const getAuthHeaders = () => ({
    'Authorization': effectiveToken ? `Bearer ${effectiveToken}` : '',
    'Content-Type': 'application/json'
  });

  useEffect(() => {
    if (!effectiveToken) return; // wait for auth token
    const fetchDisasters = async () => {
      try {
        const res = await fetch('https://api.e-legtas.tech/api/v1/dashboard/disasters', {
          headers: getAuthHeaders(),
        });
        const data: Disaster[] = await res.json();
        setDisasters(data);

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
          event: '*',
          schema: 'public',
          table: 'disasters',
        },
        () => {
          console.log('Realtime disaster change detected → refetching...');
          fetchDisasters();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDisaster, effectiveToken]);

  // Active Evacuation Centers Count
  useEffect(() => {
    if (!effectiveToken) return; // wait for auth token
    const fetchActiveEvacuationCenters = async (isRealtimeUpdate = false) => {
      if (!selectedDisaster?.id) return;

      try {
      if (!isRealtimeUpdate) setLoading(true);
        let url = `https://api.e-legtas.tech/api/v1/dashboard/active-evacuation-centers/${selectedDisaster.id}`;

        if (selectedDateRange?.from) {
          const timeZone = "Asia/Manila";

          // From date: midnight Manila → convert to UTC ISO
          const fromUtc = new Date(
            selectedDateRange.from.toLocaleString("en-US", { timeZone })
          );
          fromUtc.setHours(0, 0, 0, 0); // midnight Manila
          const fromIso = fromUtc.toISOString();

          // To date: if range, use its midnight; else same as from
          const toDate = selectedDateRange?.to
            ? new Date(selectedDateRange.to.toLocaleString("en-US", { timeZone }))
            : new Date(selectedDateRange.from.toLocaleString("en-US", { timeZone }));
          toDate.setHours(23, 59, 59, 999); // end of day Manila
          const toIso = toDate.toISOString();

          url += `?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`;
        }

        const response = await fetch(url, { headers: getAuthHeaders() });
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
      } finally {
        if (!isRealtimeUpdate) setLoading(false);
      }
    };

    fetchActiveEvacuationCenters();

    let channel: RealtimeChannel | null = null;

    // Subscribe to realtime ONLY if no date range
    if (!selectedDateRange?.from) {
      channel = supabase
        .channel('realtime-active-ec')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'disaster_evacuation_event',
            filter: `disaster_id=eq.${selectedDisaster?.id}`
          },
          () => fetchActiveEvacuationCenters(true)
        )
        .subscribe();
    }

    // Cleanup
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [selectedDisaster, selectedDateRange, effectiveToken]); // rerun if selected disaster changes

  // Registered Evacuees Count
  useEffect(() => {
    if (!effectiveToken) return; // wait for auth token
    const fetchRegisteredEvacueesCount = async (isRealtimeUpdate = false) => {
      if (!selectedDisaster?.id) return;

      try {
        if (!isRealtimeUpdate) setLoading(true);
        let url = `https://api.e-legtas.tech/api/v1/dashboard/registered-evacuees/${selectedDisaster.id}`;

        // If date filter applied, add query params with Manila → UTC conversion
        if (selectedDateRange?.from) {
          const timeZone = "Asia/Manila";

          // From date (midnight Manila)
          const fromUtc = new Date(
            selectedDateRange.from.toLocaleString("en-US", { timeZone })
          );
          fromUtc.setHours(0, 0, 0, 0);
          const fromIso = fromUtc.toISOString();

          // To date (end of day Manila)
          const toDate = selectedDateRange?.to
            ? new Date(selectedDateRange.to.toLocaleString("en-US", { timeZone }))
            : new Date(selectedDateRange.from.toLocaleString("en-US", { timeZone }));
          toDate.setHours(23, 59, 59, 999);
          const toIso = toDate.toISOString();

          url += `?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`;
        }

        const response = await fetch(url, { headers: getAuthHeaders() });
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
      } finally {
        if (!isRealtimeUpdate) setLoading(false);
      }
    };

    // If filter active → no realtime
    if (selectedDateRange?.from) {
      fetchRegisteredEvacueesCount();
      return;
    }

    // Live mode
    fetchRegisteredEvacueesCount();
    const channel = supabase.channel('realtime-evacuee-triggers')
    
    // (1) Listen for total_no_of_individual updates on the evacuation_summaries table
    listenToEvacuationSummaryChange(
      channel,
      selectedDisaster?.id,
      (newData, oldData) => newData?.total_no_of_individuals !== oldData?.total_no_of_individuals,
      () => fetchRegisteredEvacueesCount(true),
      'Evacuees'
    );
 
    // (2) Listen for evacuation_end_date changes
    listenToEvacuationEndDateChange(
      channel,
      selectedDisaster?.id,
      () => fetchRegisteredEvacueesCount(true),
      'Evacuees'
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDisaster, selectedDateRange, effectiveToken]);

  // Registered Families Count
  useEffect(() => {
    if (!effectiveToken) return; // wait for auth token
    const fetchRegisteredFamiliesCount = async (isRealtimeUpdate = false) => {
      if (!selectedDisaster?.id) return;

      try {
        if (!isRealtimeUpdate) setLoading(true);
        let url = `https://api.e-legtas.tech/api/v1/dashboard/registered-families/${selectedDisaster.id}`;

        // If date filter applied, add query params with Manila → UTC conversion
        if (selectedDateRange?.from) {
          const timeZone = "Asia/Manila";

          const fromUtc = new Date(
            selectedDateRange.from.toLocaleString("en-US", { timeZone })
          );
          fromUtc.setHours(0, 0, 0, 0);
          const fromIso = fromUtc.toISOString();

          const toDate = selectedDateRange?.to
            ? new Date(selectedDateRange.to.toLocaleString("en-US", { timeZone }))
            : new Date(selectedDateRange.from.toLocaleString("en-US", { timeZone }));
          toDate.setHours(23, 59, 59, 999);
          const toIso = toDate.toISOString();

          url += `?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`;
        }

        const response = await fetch(url, { headers: getAuthHeaders() });
        const result = await response.json();

        if (response.ok) {
          setRegisteredFamiliesCount(result.count || 0);
        } else {
          console.error(result.message || 'Failed to fetch registered families.');
          setRegisteredFamiliesCount(0);
        }
      } catch (error) {
        console.error('Error fetching registered families:', error);
        setRegisteredEvacueesCount(0)
        setRegisteredEvacueesCount(0);
      } finally {
        if (!isRealtimeUpdate) setLoading(false);
      }
    };

    // If filter active → no realtime
    if (selectedDateRange?.from) {
      fetchRegisteredFamiliesCount();
      return;
    }

    // Live mode
    fetchRegisteredFamiliesCount();

    const channel = supabase.channel('realtime-family-triggers')

      // (1) Listen for total_no_of_family changes in evacuation_summaries
      listenToEvacuationSummaryChange(
        channel,
        selectedDisaster?.id,
        (newData, oldData) => newData?.total_no_of_family !== oldData?.total_no_of_family,
        () => fetchRegisteredFamiliesCount(true),
        'Families'
      );

      // (2) Listen for evacuation_end_date changes
      listenToEvacuationEndDateChange(
        channel, 
        selectedDisaster?.id, 
        () => fetchRegisteredFamiliesCount(true), 
        'Families'
      );

      channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDisaster, selectedDateRange, effectiveToken]);

// Families with Relief Goods Count (live + filtered)
useEffect(() => {
  if (!effectiveToken) return; // wait for auth token

  const fetchFamiliesWithReliefGoodsCount = async (isRealtimeUpdate = false) => {
    if (!selectedDisaster?.id) return;

    try {
      if (!isRealtimeUpdate) setLoading(true);
      let url = `/api/v1/dashboard/families-with-relief-goods/${selectedDisaster.id}`;

      // If date filter applied, add query params with Manila -> UTC conversion
      if (selectedDateRange?.from) {
        const timeZone = "Asia/Manila";

        const fromUtc = new Date(
          selectedDateRange.from.toLocaleString("en-US", { timeZone })
        );
        fromUtc.setHours(0, 0, 0, 0);
        const fromIso = fromUtc.toISOString();

        const toDate = selectedDateRange?.to
          ? new Date(selectedDateRange.to.toLocaleString("en-US", { timeZone }))
          : new Date(selectedDateRange.from.toLocaleString("en-US", { timeZone }));
        toDate.setHours(23, 59, 59, 999);
        const toIso = toDate.toISOString();

        url += `?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`;
      }

      const response = await fetch(url, { headers: getAuthHeaders() });
      const result = await response.json();

      if (response.ok) {
        setFamiliesWithReliefGoodsCount(result.count || 0);
      } else {
        console.error(result.message || 'Failed to fetch families with relief goods.');
        setFamiliesWithReliefGoodsCount(0);
      }
    } catch (error) {
      console.error('Error fetching families with relief goods:', error);
      setFamiliesWithReliefGoodsCount(0);
    } finally {
      if (!isRealtimeUpdate) setLoading(false);
    }
  };

  // If filter active → no realtime
  if (selectedDateRange?.from) {
    fetchFamiliesWithReliefGoodsCount();
    return;
  }

  // Live mode
  fetchFamiliesWithReliefGoodsCount();

  const channel = supabase.channel('realtime-families-with-relief-goods');

  // ---- listen to services table changes ----
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'services' },
    async (payload: any) => {
      // row that changed
      const row = payload.new || payload.old;
      const eventId = row?.disaster_evacuation_event_id || row?.disaster_evacuation_event?.id;

        // if helper accepts (eventId, disasterId) or (row, disasterId) we attempt both safely
        if (selectedDisaster?.id && eventId) {
          const linked = await isEventLinkedToSelectedDisaster(eventId, 'event', selectedDisaster.id);
          if (linked) fetchFamiliesWithReliefGoodsCount(true);
        }
    }
  );

  // ---- listen to evacuation_registrations changes (decampment changes) ----
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'evacuation_registrations' },
    async (payload: any) => {
      const row = payload.new || payload.old;
      const eventId = row?.disaster_evacuation_event_id || row?.disaster_evacuation_event?.id;

      if (selectedDisaster?.id && eventId) {
        const linked = await isEventLinkedToSelectedDisaster(eventId, 'event', selectedDisaster.id);
        if (linked) fetchFamiliesWithReliefGoodsCount(true);
      }
    }
  );

  // ---- also listen for evacuation_end_date changes on disaster_evacuation_event ----
  listenToEvacuationEndDateChange(
    channel,
    selectedDisaster?.id,
    () => fetchFamiliesWithReliefGoodsCount(true),
    'ReliefGoods'
  );

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [selectedDisaster, selectedDateRange, effectiveToken]);

  // Evacuee Statistics
  useEffect(() => {
    if (!effectiveToken) return; // wait for auth token
    const fetchEvacueeStatistics = async (isRealtimeUpdate = false) => {
      if (!selectedDisaster?.id) return;

      try {
        if (!isRealtimeUpdate) setLoading(true);
        let url = `https://api.e-legtas.tech/api/v1/dashboard/evacuee-statistics/${selectedDisaster.id}`;

        // If date filter applied, add query params (Manila → UTC conversion)
        if (selectedDateRange?.from) {
          const timeZone = "Asia/Manila";

          // From date (midnight Manila)
          const fromUtc = new Date(
            selectedDateRange.from.toLocaleString("en-US", { timeZone })
          );
          fromUtc.setHours(0, 0, 0, 0);
          const fromIso = fromUtc.toISOString();

          // To date (end of day Manila)
          const toDate = selectedDateRange?.to
            ? new Date(selectedDateRange.to.toLocaleString("en-US", { timeZone }))
            : new Date(selectedDateRange.from.toLocaleString("en-US", { timeZone }));
          toDate.setHours(23, 59, 59, 999);
          const toIso = toDate.toISOString();

          url += `?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`;
        }

        const response = await fetch(url, { headers: getAuthHeaders() });
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
          console.error(result.message || "Failed to fetch evacuee statistics.");
          setEvacueeStatistics([]);
        }
      } catch (error) {
        console.error("Error fetching evacuee statistics:", error);
        setEvacueeStatistics([]);
      } finally {
        if (!isRealtimeUpdate) setLoading(false);
      }
    };

    // If filter active → fetch once (no realtime)
    if (selectedDateRange?.from) {
      fetchEvacueeStatistics();
      return;
    }

    // Live mode
    fetchEvacueeStatistics();
    const channel = supabase.channel("realtime-evacuee-statistics");

    // (1) Listen for evacuee stats changes in evacuation_summaries
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
      () => fetchEvacueeStatistics(true),
      "Evacuee Stats"
    );

    // (2) Listen for evacuation_end_date changes
    listenToEvacuationEndDateChange(
      channel,
      selectedDisaster?.id,
      () => fetchEvacueeStatistics(true),
      "Evacuee Stats"
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDisaster, selectedDateRange, effectiveToken]);

  // Evacuation Center Capacity Status
  useEffect(() => {
    if (!token) return; // wait for auth token
    const fetchEvacuationCapacityStatus = async (isRealtimeUpdate = false) => {
      if (!selectedDisaster?.id) return;

      try {
        if (!isRealtimeUpdate) setLoading(true);
        let url = `https://api.e-legtas.tech/api/v1/dashboard/capacity-status/${selectedDisaster.id}`;

        // If date filter applied, add query params with Manila → UTC conversion
        if (selectedDateRange?.from) {
          const timeZone = "Asia/Manila";

          // From date (midnight Manila)
          const fromUtc = new Date(
            selectedDateRange.from.toLocaleString("en-US", { timeZone })
          );
          fromUtc.setHours(0, 0, 0, 0);
          const fromIso = fromUtc.toISOString();

          // To date (end of day Manila)
          const toDate = selectedDateRange?.to
            ? new Date(selectedDateRange.to.toLocaleString("en-US", { timeZone }))
            : new Date(selectedDateRange.from.toLocaleString("en-US", { timeZone }));
          toDate.setHours(23, 59, 59, 999);
          const toIso = toDate.toISOString();

          url += `?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`;
        }

  const response = await fetch(url, { headers: getAuthHeaders() });
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
      } finally {
        if (!isRealtimeUpdate) setLoading(false);
      }
    };

    // If date filter is active → Historical mode (no realtime)
    if (selectedDateRange?.from) {
      fetchEvacuationCapacityStatus();
      return;
    }

    // Live mode (no date filter) → fetch + realtime updates
    fetchEvacuationCapacityStatus();

    const channel = supabase.channel('realtime-evacuation-center-capacity');

    // (1) Listen to changes in evacuation_summaries
    listenToEvacuationSummaryChange(
      channel,
      selectedDisaster?.id,
      (newData, oldData) =>
        newData?.total_no_of_individuals !== oldData?.total_no_of_individuals,
      () => fetchEvacuationCapacityStatus(true),
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
          'center',
          selectedDisaster?.id
        );

        if (isRelevant) {
          console.log('Relevant evacuation_center capacity change → refetching');
          fetchEvacuationCapacityStatus(true);
        }
      }
    );

    // (3) Listen to updates in disaster_evacuation_event (evacuation_end_date changed)
    listenToEvacuationEndDateChange(
      channel,
      selectedDisaster?.id,
      () => fetchEvacuationCapacityStatus(true),
      'Capacity Status'
    );

    // (4) Listen to new active events inserted
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'disaster_evacuation_event',
      },
      (payload) => {
        const inserted = payload.new;
        if (
          inserted?.disaster_id === selectedDisaster?.id &&
          inserted?.evacuation_end_date === null
        ) {
          console.log('New active evacuation event inserted');
          fetchEvacuationCapacityStatus(true);
        }
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDisaster, selectedDateRange, token]);

  return {
    disasters,
    selectedDisaster,
    setSelectedDisaster,
    activeEvacuationCenters,
    registeredEvacueesCount,
    registeredFamiliesCount,
    familiesWithReliefGoodsCount, 
    evacueeStatistics,
    evacuationCapacityStatus,
    loading,
  };
}