import { useRef } from 'react';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import shadow from 'leaflet/dist/images/marker-shadow.png';
import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet';
import ECMarker from '../assets/ECMarker.svg'; 

// Set default marker (not required if using custom icon for all)
L.Icon.Default.mergeOptions({
  iconUrl: icon,
  iconRetinaUrl: iconRetina,
  shadowUrl: shadow,
});

// Create custom marker icon
const evacCenterIcon = new L.Icon({
  iconUrl: ECMarker,
  iconSize: [50, 50],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

type EvacuationCenter = {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  capacity_families: number;
};


type GISMapProps = {
  onMarkerClick: (evacuationCenter: EvacuationCenter) => void;
};

export default function GISMap({ onMarkerClick }: GISMapProps) {
  const mapRef = useRef<L.Map | null>(null);

const evacuationCenters: EvacuationCenter[] = [
  {
    id: 1,
    name: 'Legazpi City High School',
    address: 'Bogtong, Legazpi City',
    latitude: 13.1373,
    longitude: 123.7439,
    capacity_families: 100,
  },
  {
    id: 2,
    name: 'Bicol University Main Campus',
    address: 'Rizal St., Legazpi City',
    latitude: 13.144024,
    longitude: 123.724785,
    capacity_families: 150,

  },
  {
    id: 3,
    name: 'Legazpi Port District Central School',
    address: 'Legazpi Port, Legazpi City',
    latitude: 13.1443,
    longitude: 123.7498,
    capacity_families: 80,

  },
  {
    id: 4,
    name: 'Legazpi East Central Elementary School',
    address: 'Tagas, Legazpi City',
    latitude: 13.1425,
    longitude: 123.7603,
    capacity_families: 120,

  },
  {
    id: 5,
    name: 'Tamaoyan Elementary School',
    address: 'Tamaoyan, Legazpi City',
    latitude: 13.1121,
    longitude: 123.7152,
    capacity_families: 60,

  }
];

  const handleMarkerClick = (evacuationCenter: EvacuationCenter) => {
    if (mapRef.current) {
      mapRef.current.flyTo([evacuationCenter.latitude, evacuationCenter.longitude], 17, {
        animate: true,
        duration: 1.5,
      });
    }

    onMarkerClick(evacuationCenter);
  };

  return (
    <MapContainer
      center={[13.1391, 123.7438]}
      zoom={15}
      scrollWheelZoom={true}
      style={{ height: '100vh', width: '100%' }}
      ref={mapRef}
    >
      <TileLayer
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {evacuationCenters.map((center) => (
        <Marker
          key={center.id}
          position={[center.latitude, center.longitude]}
          icon={evacCenterIcon}
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
      ))}
    </MapContainer>
  );
}
