import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapPin, Navigation } from 'lucide-react';

interface LocationPickerProps {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lon: number, isGps: boolean) => void;
  sector: string;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  latitude,
  longitude,
  onChange,
  sector
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [latitude || 30.7333, longitude || 76.7794],
        zoom: 14,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const pinIcon = L.divIcon({
        html: `
          <div style="
            background-color: #0F766E;
            width: 28px;
            height: 28px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2px solid white;
            box-shadow: 0 3px 6px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
          </div>
        `,
        className: 'custom-pin-marker',
        iconSize: [28, 28],
        iconAnchor: [14, 28]
      });

      const marker = L.marker([latitude || 30.7333, longitude || 76.7794], {
        icon: pinIcon,
        draggable: true
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onChange(Number(pos.lat.toFixed(5)), Number(pos.lng.toFixed(5)), false);
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        onChange(Number(e.latlng.lat.toFixed(5)), Number(e.latlng.lng.toFixed(5)), false);
      });

      markerRef.current = marker;
      mapInstanceRef.current = map;
    }
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
      // Bring the pin into view when it was moved programmatically (e.g. voice auto-fill)
      const map = mapInstanceRef.current;
      if (!map.getBounds().pad(-0.2).contains([latitude, longitude])) {
        map.setView([latitude, longitude], Math.max(map.getZoom(), 14));
      }
    }
  }, [latitude, longitude]);

  const handleUseGps = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(5));
          const lon = Number(pos.coords.longitude.toFixed(5));
          onChange(lat, lon, true);
          if (mapInstanceRef.current && markerRef.current) {
            mapInstanceRef.current.setView([lat, lon], 15);
            markerRef.current.setLatLng([lat, lon]);
          }
        },
        () => {
          // Fallback to Aroma Chowk Sector 22 demo coordinates
          const lat = 30.7328;
          const lon = 76.7729;
          onChange(lat, lon, false);
          if (mapInstanceRef.current && markerRef.current) {
            mapInstanceRef.current.setView([lat, lon], 15);
            markerRef.current.setLatLng([lat, lon]);
          }
        }
      );
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#6C757D] flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-[#0F766E]" />
          Click on map to position the incident pin
        </span>
        <button
          type="button"
          onClick={handleUseGps}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#0F766E] bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-md transition-colors"
        >
          <Navigation className="w-3 h-3" />
          Acquire GPS Pin
        </button>
      </div>

      <div
        ref={mapContainerRef}
        style={{ height: '240px', width: '100%' }}
        className="rounded-lg border border-[#E5E7EB] overflow-hidden"
      />

      <div className="flex items-center justify-between text-[11px] text-[#6C757D] px-1">
        <span>Lat: {latitude} • Lon: {longitude}</span>
        <span className="font-medium text-[#374151]">{sector || 'Sector 22'}</span>
      </div>
    </div>
  );
};
