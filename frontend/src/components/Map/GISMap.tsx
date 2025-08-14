import { useRef, useEffect, useState } from 'react';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import shadow from 'leaflet/dist/images/marker-shadow.png';
import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet';
import ECMarker from '../../assets/ECMarker.svg'; 
import type { EvacuationCenter } from '@/types/EvacuationCenter';


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


type GISMapProps = {
  onMarkerClick: (evacuationCenter: EvacuationCenter) => void;
};

export default function GISMap({ onMarkerClick }: GISMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [evacuationCenters, setEvacuationCenters] = useState<EvacuationCenter[]>([]);

useEffect(() => {
  fetch('http://localhost:3000/api/v1/evacuation-centers/detailed-map-data')
    .then((res) => res.json())
    .then((res) => {
      console.log('Evacuation Centers:', res.data);
      setEvacuationCenters(res.data); // <<== this is the fix
    })
    .catch((err) => {
      console.error('Failed to fetch evacuation centers:', err);
    });
}, []);



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
