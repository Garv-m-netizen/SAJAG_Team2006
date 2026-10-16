import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Incident } from '../../types';

interface IncidentMapProps {
  incidents: Incident[];
  onSelectIncident?: (incident: Incident) => void;
  selectedIncidentId?: number | null;
  height?: string;
}

export const IncidentMap: React.FC<IncidentMapProps> = ({
  incidents,
  onSelectIncident,
  selectedIncidentId,
  height = '420px'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Initialize map centered on Chandigarh
      const map = L.map(mapContainerRef.current, {
        center: [30.7333, 76.7794],
        zoom: 13,
        zoomControl: true,
      });

      // Use a clean OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      markersGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      // Map cleanup on unmount handled gracefully
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;

    markersGroupRef.current.clearLayers();

    incidents.forEach((inc) => {
      const lat = inc.location.latitude;
      const lon = inc.location.longitude;
      if (!lat || !lon) return;

      const isSelected = selectedIncidentId === inc.id;
      const effPriority = inc.priority_override ?? inc.priority_score;

      // Color based on urgency/priority
      let color = '#0F766E'; // teal (medium/low)
      if (effPriority >= 75 || inc.urgency === 'critical') {
        color = '#DC2626'; // red (critical)
      } else if (effPriority >= 55 || inc.urgency === 'high') {
        color = '#D97706'; // amber (high)
      }

      const customHtml = `
        <div style="
          background-color: ${color};
          width: ${isSelected ? '28px' : '22px'};
          height: ${isSelected ? '28px' : '22px'};
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 10px;
          font-weight: bold;
          cursor: pointer;
        ">
          ${Math.round(effPriority)}
        </div>
      `;

      const icon = L.divIcon({
        html: customHtml,
        className: 'custom-map-marker',
        iconSize: [isSelected ? 28 : 22, isSelected ? 28 : 22],
        iconAnchor: [isSelected ? 14 : 11, isSelected ? 14 : 11]
      });

      const marker = L.marker([lat, lon], { icon });

      marker.bindPopup(`
        <div style="font-family: Inter, sans-serif; font-size: 12px; line-height: 1.4; max-width: 200px;">
          <div style="display:flex; justify-content:space-between; margin-bottom: 4px;">
            <span style="font-weight:700; color:#1A1D20;">#${inc.incident_number}</span>
            <span style="color:#0F766E; font-weight:600;">Priority: ${Math.round(effPriority)}</span>
          </div>
          <p style="font-weight:600; color:#374151; margin:0 0 4px 0;">${inc.title}</p>
          <p style="color:#6C757D; margin:0 0 6px 0; font-size:11px;">${inc.location.sector} • ${inc.location.landmark || ''}</p>
          <span style="display:inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; background-color: #F1F3F5; color: #4B5563;">
            Status: ${inc.status.toUpperCase()}
          </span>
        </div>
      `);

      marker.on('click', () => {
        if (onSelectIncident) {
          onSelectIncident(inc);
        }
      });

      markersGroupRef.current?.addLayer(marker);
    });
  }, [incidents, selectedIncidentId, onSelectIncident]);

  return (
    <div
      ref={mapContainerRef}
      style={{ height, width: '100%' }}
      className="rounded-lg border border-[#E5E7EB] shadow-2xs z-10"
    />
  );
};
