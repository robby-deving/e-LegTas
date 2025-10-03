import { useRef, useEffect, useState, useCallback } from 'react';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import shadow from 'leaflet/dist/images/marker-shadow.png';
import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet';
import ECMarker from '../../assets/ECMarker.svg';
import fullIcon from '../../assets/full.svg';
import overcapacityIcon from '../../assets/overcapacity.svg';
import unavailableIcon from '../../assets/unavailable.svg';
import type { EvacuationCenter } from '@/types/EvacuationCenter';
import { store } from '@/store';
import { selectToken, selectUserId } from '@/features/auth/authSlice';


L.Icon.Default.mergeOptions({
  iconUrl: icon,
  iconRetinaUrl: iconRetina,
  shadowUrl: shadow,
});

const evacCenterIcon = new L.Icon({
  iconUrl: ECMarker,
  iconSize: [50, 50],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const fullCapacityIcon = new L.Icon({
  iconUrl: fullIcon,
  iconSize: [39, 40],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const overCapacityIcon = new L.Icon({
  iconUrl: overcapacityIcon,
  iconSize: [39, 40],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const unavailableCapacityIcon = new L.Icon({
  iconUrl: unavailableIcon,
  iconSize: [39, 40],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Cache constants
const CACHE_KEY = 'evacuation_centers_cache';
const CACHE_TIMESTAMP_KEY = 'evacuation_centers_timestamp';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes in milliseconds

type GISMapProps = {
  onMarkerClick: (evacuationCenter: EvacuationCenter) => void;
  onLastUpdatedChange?: (timestamp: Date | null) => void;
  height?: string; // Add this prop
};

export default function GISMap({ onMarkerClick, onLastUpdatedChange, height = '100vh' }: GISMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [evacuationCenters, setEvacuationCenters] = useState<EvacuationCenter[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Cache utility functions
  const getCachedData = useCallback(() => {
    try {
      const cachedData = localStorage.getItem(CACHE_KEY);
      const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

      if (cachedData && cachedTimestamp) {
        const timestamp = new Date(cachedTimestamp);
        const now = new Date();

        // Check if cache is still valid (within TTL)
        if (now.getTime() - timestamp.getTime() < CACHE_TTL) {
          return {
            data: JSON.parse(cachedData),
            timestamp: timestamp
          };
        } else {
          // Cache expired, clean it up
          localStorage.removeItem(CACHE_KEY);
          localStorage.removeItem(CACHE_TIMESTAMP_KEY);
        }
      }
    } catch (error) {
      console.error('Error reading from cache:', error);
    }
    return null;
  }, []);

  const setCachedData = useCallback((data: EvacuationCenter[]) => {
    try {
      const now = new Date();
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, now.toISOString());
      setLastUpdated(now);
      onLastUpdatedChange?.(now);
    } catch (error) {
      console.error('Error writing to cache:', error);
    }
  }, [onLastUpdatedChange]);

  const getMarkerIcon = (center: EvacuationCenter) => {
    // Check status first (highest priority)
    if (center.ec_status === 'Unavailable') {
      return unavailableCapacityIcon;
    }

    // Then check capacity
    if (center.current_capacity > center.total_capacity) {
      return overCapacityIcon;
    } else if (center.current_capacity === center.total_capacity) {
      return fullCapacityIcon;
    } else {
      return evacCenterIcon;
    }
  };

  const buildHeaders = (extra: Record<string, string> = {}) => {
    const state = store.getState() as any;
    const token = selectToken(state);
    const userId = selectUserId(state);
    const devUserId = (import.meta as any).env?.VITE_DEV_USER_ID as string | undefined;
    const headers: Record<string, string> = { Accept: 'application/json', ...extra };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!token && userId) headers['x-user-id'] = String(userId);
    if (!token && !userId && devUserId) headers['x-user-id'] = String(devUserId);
    return headers;
  };

  const fetchEvacuationCenters = useCallback(async (forceRefresh = false) => {
    try {
      // Check cache first unless force refresh is requested
      if (!forceRefresh) {
        const cached = getCachedData();
        if (cached) {
          setEvacuationCenters(cached.data);
          setLastUpdated(cached.timestamp);
          onLastUpdatedChange?.(cached.timestamp);
          return;
        }
      }

      // Fetch fresh data
      const response = await fetch('/api/v1/evacuation-centers/detailed-map-data', {
        headers: buildHeaders()
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to fetch map data (${response.status}): ${text}`);
      }

      const result = await response.json();
      console.log('Evacuation Centers:', result.data);

      // Update state and cache
      setEvacuationCenters(result.data);
      setCachedData(result.data);
    } catch (err) {
      console.error('Failed to fetch evacuation centers:', err);
    }
  }, [getCachedData, setCachedData, onLastUpdatedChange]);

  const refreshData = useCallback(() => {
    fetchEvacuationCenters(true);
  }, [fetchEvacuationCenters]);

  useEffect(() => {
    fetchEvacuationCenters();
  }, [fetchEvacuationCenters]);



  const handleMarkerClick = (evacuationCenter: EvacuationCenter) => {
    if (mapRef.current) {
      mapRef.current.flyTo([evacuationCenter.latitude, evacuationCenter.longitude], 17, {
        animate: true,
        duration: 1.5,
      });
    }
    onMarkerClick(evacuationCenter);
  };

  // Expose refresh function and last updated for parent component
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).gisMapRefresh = refreshData;
      (window as any).gisMapLastUpdated = lastUpdated;
    }
  }, [refreshData, lastUpdated]);

  return (
<MapContainer
  center={[13.1391, 123.7438]}
  zoom={15}
  scrollWheelZoom={true}
  style={{ height: height, width: '100%' }} // Use the height prop
  ref={mapRef}
  className="z-0"
>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  {evacuationCenters.map((center) => {
    // Fallback to default coordinates if latitude/longitude is missing or invalid
    const lat = center.latitude || 0;  // Default latitude value
    const lon = center.longitude || 0; // Default longitude value
    return (
      <Marker
        key={center.id}
        position={[lat, lon]} 
        icon={getMarkerIcon(center)}
        eventHandlers={{
          click: () => handleMarkerClick(center),
        }}
      >
        <Tooltip
          direction="top"
          offset={[5, -30]}
          opacity={1}
          permanent={false}
        >
          <div className="px-3 py-1 rounded font-semibold text-sm">
            {center.name}
          </div>
        </Tooltip>
      </Marker>
    );
  })}
</MapContainer>

  );
}
