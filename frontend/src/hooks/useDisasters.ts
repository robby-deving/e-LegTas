import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { disasterService } from "@/services/disasterService";
import type { Disaster, DisasterPayload, DisasterTypeWithId } from "@/types/disaster";
import { selectToken } from "../features/auth/authSlice";

interface UseDisastersReturn {
  disasters: Disaster[];
  disasterTypes: DisasterTypeWithId[];
  loading: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  error: string | null;
  fetchDisastersByMonthYear: (month: number | null, year: number) => Promise<void>;
  createDisaster: (disasterData: DisasterPayload) => Promise<void>;
  updateDisaster: (disasterId: number, disasterData: DisasterPayload) => Promise<void>;
  deleteDisaster: (disasterId: number) => Promise<void>;
  refetchCurrentData: () => Promise<void>;
  refreshDisasters: () => Promise<void>;
}

const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes for better UX

export const useDisasters = (): UseDisastersReturn => {
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [disasterTypes, setDisasterTypes] = useState<DisasterTypeWithId[]>([
    { id: null, name: "All" },
  ]);
  const [loading, setLoading] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const token = useSelector(selectToken);
  const [currentMonth, setCurrentMonth] = useState<number | null>(null);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());

  const fetchDisastersByMonthYear = useCallback(
    async (month: number | null, year: number, bypassCache = false) => {
      if (!token) return;

      // Track current month/year
      setCurrentMonth(month);
      setCurrentYear(year);

      setLoading(true);
      setError(null);

      const cacheKey = `disasters_${month}_${year}`;
      const cacheTimeKey = `disasters_time_${month}_${year}`;

      try {
        // Check cache first unless bypassing
        if (!bypassCache) {
          const cachedDisasters = localStorage.getItem(cacheKey);
          const cachedDisastersTime = localStorage.getItem(cacheTimeKey);

          if (
            cachedDisasters &&
            cachedDisastersTime &&
            Date.now() - Number(cachedDisastersTime) < CACHE_DURATION
          ) {
            console.log("Using cached disasters");
            const parsed = JSON.parse(cachedDisasters);
            setDisasters(parsed);
            setLoading(false);
            return;
          }
        }

        console.log(`Fetching disasters from API for ${month}/${year}`);
        const data = await disasterService.fetchDisastersByMonthYear(month, year, token);
        console.log("API response disasters count:", data.length);
        setDisasters(data);

        // Cache the fresh data
        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(cacheTimeKey, String(Date.now()));
      } catch (err) {
        console.error("Failed to fetch disasters:", err);
        setError("Failed to fetch disasters");
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  const fetchDisasterTypes = useCallback(async () => {
    if (!token) return;

    try {
      const types = await disasterService.fetchAllDisasterTypes(token);
      setDisasterTypes([{ id: null, name: "All" }, ...types]);
    } catch (err) {
      console.error("Failed to fetch disaster types:", err);
      setError("Failed to fetch disaster types");
    }
  }, [token]);

  const refreshDisasters = useCallback(async () => {
    await fetchDisastersByMonthYear(currentMonth, currentYear, true); // bypass cache
  }, [currentMonth, currentYear, fetchDisastersByMonthYear]);

  const createDisaster = useCallback(
    async (disasterData: DisasterPayload) => {
      if (!token) return;

      setCreating(true);
      setError(null);
      try {
        await disasterService.createDisaster(disasterData, token);
        console.log("Disaster created successfully:", disasterData);
        // Refresh data and bypass cache to show new disaster
        await refreshDisasters();
      } catch (error) {
        console.error("Error creating disaster:", error);
        setError("Failed to create disaster");
        throw error;
      } finally {
        setCreating(false);
      }
    },
    [token, refreshDisasters]
  );

  const updateDisaster = useCallback(
    async (disasterId: number, disasterData: DisasterPayload) => {
      if (!token) return;

      setUpdating(true);
      setError(null);
      try {
        await disasterService.updateDisaster(disasterId, disasterData, token);
        console.log("Disaster updated successfully:", disasterData);
        // Refresh data and bypass cache to show updated disaster
        await refreshDisasters();
      } catch (error) {
        console.error("Error updating disaster:", error);
        setError("Failed to update disaster");
        throw error;
      } finally {
        setUpdating(false);
      }
    },
    [token, refreshDisasters]
  );

  const refetchCurrentData = useCallback(async () => {
    if (currentMonth !== null || currentYear !== null) {
      await fetchDisastersByMonthYear(currentMonth, currentYear);
    }
  }, [currentMonth, currentYear, fetchDisastersByMonthYear]);

  const deleteDisaster = useCallback(
    async (disasterId: number) => {
      if (!token) return;

      setDeleting(true);
      setError(null);
      try {
        await disasterService.deleteDisaster(disasterId, token);
        console.log("Disaster deleted successfully:", disasterId);
        // Refresh data and bypass cache to show updated list without deleted disaster
        await refreshDisasters();
      } catch (error) {
        console.error("Error deleting disaster:", error);
        setError("Failed to delete disaster");
        throw error;
      } finally {
        setDeleting(false);
      }
    },
    [token, refreshDisasters]
  );


  // Initial fetch for disaster types
  useEffect(() => {
    fetchDisasterTypes();
  }, [fetchDisasterTypes]);

  return {
    disasters,
    disasterTypes,
    loading,
    creating,
    updating,
    deleting,
    error,
    fetchDisastersByMonthYear,
    createDisaster,
    updateDisaster,
    deleteDisaster,
    refetchCurrentData,
    refreshDisasters,
  };
};