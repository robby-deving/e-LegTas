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
  invalidateCache: (month: number | null, year: number) => void;
}

const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

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

  const getCacheKey = (month: number | null, year: number): string => {
    return `disasters_${month}_${year}`;
  };

  const getCacheTimeKey = (month: number | null, year: number): string => {
    return `disasters_time_${month}_${year}`;
  };

  const fetchDisastersByMonthYear = useCallback(
    async (month: number | null, year: number) => {
      if (!token) return;

      setLoading(true);
      setError(null);

      const cacheKey = getCacheKey(month, year);
      const cacheTimeKey = getCacheTimeKey(month, year);

      try {
        const cachedDisasters = localStorage.getItem(cacheKey);
        const cachedDisastersTime = localStorage.getItem(cacheTimeKey);

        console.log(`fetchDisastersByMonthYear called for ${month}/${year}`);
        console.log("Cached disasters:", cachedDisasters ? "exists" : "none");
        console.log("Cache time:", cachedDisastersTime);

        if (
          cachedDisasters &&
          cachedDisastersTime &&
          Date.now() - Number(cachedDisastersTime) < CACHE_DURATION
        ) {
          // Use cached data if less than 5 minutes old
          console.log("Using cached disasters");
          const parsed = JSON.parse(cachedDisasters);
          console.log("Parsed cached disasters count:", parsed.length);
          setDisasters(parsed);
        } else {
          console.log("Fetching fresh disasters from API...");
          const data = await disasterService.fetchDisastersByMonthYear(month, year, token);
          console.log("API response disasters count:", data.length);
          setDisasters(data);
          localStorage.setItem(cacheKey, JSON.stringify(data));
          localStorage.setItem(cacheTimeKey, String(Date.now()));
          console.log("Fresh disasters cached");
        }
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
      const cachedTypes = localStorage.getItem("disaster_types_with_id");
      const cachedTypesTime = localStorage.getItem("disaster_types_time");

      if (
        cachedTypes &&
        cachedTypesTime &&
        Date.now() - Number(cachedTypesTime) < CACHE_DURATION
      ) {
        // Parse as DisasterTypeWithId[]
        const parsedCachedTypes: DisasterTypeWithId[] = JSON.parse(cachedTypes);
        setDisasterTypes([{ id: null, name: "All" }, ...parsedCachedTypes]);
      } else {
        const types = await disasterService.fetchAllDisasterTypes(token);
        setDisasterTypes([{ id: null, name: "All" }, ...types]);
        localStorage.setItem("disaster_types_with_id", JSON.stringify(types));
        localStorage.setItem("disaster_types_time", String(Date.now()));
      }
    } catch (err) {
      console.error("Failed to fetch disaster types:", err);
      setError("Failed to fetch disaster types");
    }
  }, [token]);

  const createDisaster = useCallback(
    async (disasterData: DisasterPayload) => {
      if (!token) return;

      setCreating(true);
      setError(null);
      try {
        await disasterService.createDisaster(disasterData, token);
        console.log("Disaster created successfully:", disasterData);
        // Invalidate all caches since we don't know which month/year this affects
        invalidateAllCaches();
      } catch (error) {
        console.error("Error creating disaster:", error);
        setError("Failed to create disaster");
        throw error;
      } finally {
        setCreating(false);
      }
    },
    [token]
  );

  const updateDisaster = useCallback(
    async (disasterId: number, disasterData: DisasterPayload) => {
      if (!token) return;

      setUpdating(true);
      setError(null);
      try {
        await disasterService.updateDisaster(disasterId, disasterData, token);
        console.log("Disaster updated successfully:", disasterData);
        // Invalidate all caches since we don't know which month/year this affects
        invalidateAllCaches();
      } catch (error) {
        console.error("Error updating disaster:", error);
        setError("Failed to update disaster");
        throw error;
      } finally {
        setUpdating(false);
      }
    },
    [token]
  );

  const deleteDisaster = useCallback(
    async (disasterId: number) => {
      if (!token) return;

      setDeleting(true);
      setError(null);
      try {
        await disasterService.deleteDisaster(disasterId, token);
        console.log("Disaster deleted successfully:", disasterId);
        // Invalidate all caches since we don't know which month/year this affects
        invalidateAllCaches();
      } catch (error) {
        console.error("Error deleting disaster:", error);
        setError("Failed to delete disaster");
        throw error;
      } finally {
        setDeleting(false);
      }
    },
    [token]
  );

  const invalidateCache = useCallback((month: number | null, year: number) => {
    const cacheKey = getCacheKey(month, year);
    const cacheTimeKey = getCacheTimeKey(month, year);
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(cacheTimeKey);
  }, []);

  const invalidateAllCaches = useCallback(() => {
    // Remove all disaster caches
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith("disasters_")) {
        localStorage.removeItem(key);
      }
    });
  }, []);

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
    invalidateCache,
  };
};