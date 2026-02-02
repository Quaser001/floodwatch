'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useFloodStore } from '@/lib/store';
import { GUWAHATI_CENTER } from '@/lib/types';

// Free OSM vector tile style with street-level detail
const MAP_STYLE = 'https://api.maptiler.com/maps/streets-v2-dark/style.json?key=get_free_key';

// Alternative free style using OSM tiles (no API key needed)
const OSM_STYLE = {
  version: 8,
  name: 'OSM Dark',
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors, © CARTO',
    },
    // OpenMapTiles vector source for detailed roads
    'openmaptiles': {
      type: 'vector',
      tiles: ['https://tiles.stadiamaps.com/data/openmaptiles/{z}/{x}/{y}.pbf'],
      maxzoom: 14,
      attribution: '© OpenMapTiles © OpenStreetMap contributors'
    }
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#0f172a' }
    },
    {
      id: 'osm-tiles-layer',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
    // Road labels from vector tiles (appear at higher zoom)
    {
      id: 'road-label',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'transportation_name',
      minzoom: 14,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Regular'],
        'text-size': 10,
        'symbol-placement': 'line',
        'text-rotation-alignment': 'map',
      },
      paint: {
        'text-color': '#94a3b8',
        'text-halo-color': '#0f172a',
        'text-halo-width': 1,
      }
    }
  ],
  glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
};

// Simpler dark style with good detail
const DARK_STYLE = {
  version: 8 as const,
  name: 'Dark Streets',
  sources: {
    'carto-dark': {
      type: 'raster' as const,
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors, © CARTO',
    },
  },
  layers: [
    {
      id: 'carto-dark-layer',
      type: 'raster' as const,
      source: 'carto-dark',
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

interface FloodMapProps {
  routeGeometry?: [number, number][];
}

export default function FloodMap({ routeGeometry }: FloodMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const alertMarkersRef = useRef<maplibregl.Marker[]>([]);
  const sensorMarkersRef = useRef<maplibregl.Marker[]>([]);
  const selectedMarkerRef = useRef<maplibregl.Marker | null>(null);

  const { reports, alerts, sensors, setSelectedLocation, selectedLocation } = useFloodStore();
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: DARK_STYLE,
      center: [GUWAHATI_CENTER.lng, GUWAHATI_CENTER.lat],
      zoom: 13,
      minZoom: 10,
      maxZoom: 19,
      attributionControl: false,
    });

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');

    // Add scale
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');

    // Add attribution
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    // Click handler for location selection
    map.on('click', (e) => {
      setSelectedLocation({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    map.on('load', () => {
      setMapLoaded(true);

      // Add 3D building layer for premium look
      if (map.getLayer('building')) {
        map.setPaintProperty('building', 'fill-extrusion-height', [
          'interpolate', ['linear'], ['zoom'],
          15, 0,
          16, ['get', 'height']
        ]);
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [setSelectedLocation]);

  // Update report markers
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    reports.forEach((report) => {
      if (!report.isActive) return;

      const color = {
        flood: '#dc2626',
        waterlogging: '#f97316',
        drain_overflow: '#eab308',
      }[report.type];

      const emoji = report.type === 'flood' ? '🌊' : report.type === 'waterlogging' ? '💧' : '🚰';

      // Create marker element
      const el = document.createElement('div');
      el.className = 'flood-marker';
      el.innerHTML = `
        <div style="
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: ${color};
          border: 3px solid white;
          box-shadow: 0 2px 10px rgba(0,0,0,0.4), 0 0 25px ${color}50;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          cursor: pointer;
          transition: transform 0.2s ease;
        ">${emoji}</div>
      `;

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.15)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });

      // Create popup
      const popup = new maplibregl.Popup({ offset: 20, closeButton: false })
        .setHTML(`
          <div style="min-width: 220px; padding: 4px;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px; color: #f8fafc;">
              ${report.type.replace('_', ' ').toUpperCase()}
            </div>
            <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">
              📍 ${report.areaName}
            </div>
            ${report.description ? `<div style="font-size: 12px; color: #cbd5e1; margin-bottom: 8px;">${report.description}</div>` : ''}
            <div style="font-size: 11px; color: #64748b;">
              🕒 ${new Date(report.timestamp).toLocaleTimeString()}
            </div>
            ${report.photoVerified ? '<div style="margin-top: 8px; font-size: 11px; color: #10b981;">✓ Photo verified</div>' : ''}
          </div>
        `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([report.location.lng, report.location.lat])
        .setPopup(popup)
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
    });
  }, [reports, mapLoaded]);

  // Update alert zones
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    // Clear existing
    alertMarkersRef.current.forEach(m => m.remove());
    alertMarkersRef.current = [];

    // Remove existing alert sources/layers
    alerts.forEach((alert, index) => {
      const sourceId = `alert-zone-${index}`;
      if (mapRef.current!.getSource(sourceId)) {
        mapRef.current!.removeLayer(`${sourceId}-fill`);
        mapRef.current!.removeLayer(`${sourceId}-outline`);
        mapRef.current!.removeSource(sourceId);
      }
    });

    alerts.forEach((alert, index) => {
      if (!alert.isActive) return;

      const color = {
        critical: '#dc2626',
        high: '#f97316',
        medium: '#eab308',
      }[alert.severity];

      // Create circle geometry
      const center = [alert.location.lng, alert.location.lat];
      const radiusKm = alert.radius / 1000;
      const points = 64;
      const coords = [];

      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * 2 * Math.PI;
        const dx = radiusKm * Math.cos(angle);
        const dy = radiusKm * Math.sin(angle);
        const lat = center[1] + (dy / 111.32);
        const lng = center[0] + (dx / (111.32 * Math.cos(center[1] * Math.PI / 180)));
        coords.push([lng, lat]);
      }

      const sourceId = `alert-zone-${index}`;

      mapRef.current!.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [coords]
          }
        }
      });

      // Fill layer
      mapRef.current!.addLayer({
        id: `${sourceId}-fill`,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': color,
          'fill-opacity': 0.15
        }
      });

      // Outline layer
      mapRef.current!.addLayer({
        id: `${sourceId}-outline`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': color,
          'line-width': 2,
          'line-dasharray': alert.severity === 'critical' ? [1] : [4, 2]
        }
      });

      // Center marker with popup
      const el = document.createElement('div');
      el.innerHTML = `
        <div style="
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${color};
          border: 2px solid white;
          box-shadow: 0 0 15px ${color}80;
          animation: alertPulse 2s ease-in-out infinite;
        "></div>
      `;

      const popup = new maplibregl.Popup({ offset: 15 })
        .setHTML(`
          <div style="min-width: 250px; padding: 4px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(148, 163, 184, 0.2);">
              <span style="background: ${color}40; color: ${color}; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase;">${alert.severity}</span>
              <span style="font-weight: 600; font-size: 14px; color: #f8fafc;">${alert.areaName}</span>
            </div>
            <div style="font-size: 12px; color: #94a3b8; margin-bottom: 8px;">
              ${alert.type.replace('_', ' ')} • ${alert.reportCount} reports
            </div>
            <div style="font-size: 12px; margin-bottom: 12px;">
              <strong style="color: #f8fafc;">Confidence:</strong> 
              <span style="color: ${color};">${alert.confidenceScore}/10</span>
            </div>
            <div style="font-size: 11px; color: #64748b;">
              📢 ${alert.notifiedUsers} users notified
            </div>
          </div>
        `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([alert.location.lng, alert.location.lat])
        .setPopup(popup)
        .addTo(mapRef.current!);

      alertMarkersRef.current.push(marker);
    });
  }, [alerts, mapLoaded]);

  // Update sensor markers
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    sensorMarkersRef.current.forEach(m => m.remove());
    sensorMarkersRef.current = [];

    sensors.forEach((sensor) => {
      const color = {
        normal: '#10b981',
        warning: '#eab308',
        critical: '#dc2626',
        offline: '#64748b'
      }[sensor.status];

      const el = document.createElement('div');
      el.innerHTML = `
        <div style="
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: linear-gradient(135deg, ${color} 0%, ${color}cc 100%);
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: white;
          font-weight: bold;
          cursor: pointer;
        ">📡</div>
      `;

      const popup = new maplibregl.Popup({ offset: 15 })
        .setHTML(`
          <div style="min-width: 180px; padding: 4px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid rgba(148, 163, 184, 0.2);">
              <span style="font-size: 16px;">📡</span>
              <span style="font-weight: 600; font-size: 13px; color: #f8fafc;">${sensor.areaName}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; color: #cbd5e1;">
              <span>Status:</span>
              <span style="color: ${color}; font-weight: 600; text-transform: uppercase;">${sensor.status}</span>
            </div>
            ${sensor.lastReading ? `
              <div style="background: rgba(15, 23, 42, 0.5); padding: 8px; border-radius: 6px; margin-top: 8px;">
                <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
                  <span style="color: #94a3b8;">Water Level:</span>
                  <span style="color: #f8fafc; font-weight: 500;">${sensor.lastReading.waterLevelCm.toFixed(1)} cm</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 11px;">
                  <span style="color: #94a3b8;">Rainfall:</span>
                  <span style="color: #f8fafc; font-weight: 500;">${sensor.lastReading.rainfallMmPerHour} mm/h</span>
                </div>
              </div>
            ` : ''}
          </div>
        `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([sensor.location.lng, sensor.location.lat])
        .setPopup(popup)
        .addTo(mapRef.current!);

      sensorMarkersRef.current.push(marker);
    });
  }, [sensors, mapLoaded]);

  // Show selected location
  useEffect(() => {
    if (!mapRef.current || !selectedLocation) return;

    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove();
    }

    const el = document.createElement('div');
    el.innerHTML = `
      <div style="
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #3b82f6;
        border: 3px solid white;
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.4);
        animation: selectedPulse 1.5s ease-in-out infinite;
      "></div>
    `;

    selectedMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([selectedLocation.lng, selectedLocation.lat])
      .addTo(mapRef.current);

    return () => {
      if (selectedMarkerRef.current) {
        selectedMarkerRef.current.remove();
        selectedMarkerRef.current = null;
      }
    };
  }, [selectedLocation]);

  // Display route geometry
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const sourceId = 'route-line';
    const layerId = 'route-line-layer';
    const outlineLayerId = 'route-line-outline';

    // Remove existing route layers
    if (mapRef.current.getLayer(layerId)) {
      mapRef.current.removeLayer(layerId);
    }
    if (mapRef.current.getLayer(outlineLayerId)) {
      mapRef.current.removeLayer(outlineLayerId);
    }
    if (mapRef.current.getSource(sourceId)) {
      mapRef.current.removeSource(sourceId);
    }

    if (!routeGeometry || routeGeometry.length < 2) return;

    console.log('[FloodMap] Drawing route with', routeGeometry.length, 'points');

    // Add route source
    mapRef.current.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: routeGeometry
        }
      }
    });

    // Add route outline (for border effect)
    mapRef.current.addLayer({
      id: outlineLayerId,
      type: 'line',
      source: sourceId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#1e40af',
        'line-width': 8,
        'line-opacity': 0.8
      }
    });

    // Add route line
    mapRef.current.addLayer({
      id: layerId,
      type: 'line',
      source: sourceId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#3b82f6',
        'line-width': 5,
        'line-opacity': 1
      }
    });

    // Fit map to route bounds
    let minLng = routeGeometry[0][0];
    let minLat = routeGeometry[0][1];
    let maxLng = routeGeometry[0][0];
    let maxLat = routeGeometry[0][1];

    for (const coord of routeGeometry) {
      minLng = Math.min(minLng, coord[0]);
      minLat = Math.min(minLat, coord[1]);
      maxLng = Math.max(maxLng, coord[0]);
      maxLat = Math.max(maxLat, coord[1]);
    }

    mapRef.current.fitBounds([[minLng, minLat], [maxLng, maxLat]], {
      padding: 80,
      duration: 1000
    });

  }, [routeGeometry, mapLoaded]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-2xl" />



      {/* Click instruction */}
      {!selectedLocation && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 glass-card px-4 py-2 text-sm text-slate-300 z-[1000] animate-fadeIn">
          Click on the map to select a location for reporting
        </div>
      )}

      {/* Zoom hint */}
      <div className="absolute top-4 right-4 glass-card px-3 py-2 text-xs text-slate-400 z-[1000]">
        🔍 Zoom in for street-level detail
      </div>

      <style jsx global>{`
        .maplibregl-popup-content {
          background: rgba(15, 23, 42, 0.95) !important;
          backdrop-filter: blur(16px);
          border: 1px solid rgba(148, 163, 184, 0.15);
          border-radius: 12px !important;
          color: #f8fafc;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          padding: 12px !important;
        }
        
        .maplibregl-popup-tip {
          border-top-color: rgba(15, 23, 42, 0.95) !important;
        }
        
        .maplibregl-popup-close-button {
          color: #94a3b8;
          font-size: 18px;
          padding: 4px 8px;
        }
        
        .maplibregl-popup-close-button:hover {
          color: #f8fafc;
          background: transparent;
        }
        
        .maplibregl-ctrl-group {
          background: rgba(15, 23, 42, 0.9) !important;
          border: 1px solid rgba(148, 163, 184, 0.15) !important;
          border-radius: 8px !important;
        }
        
        .maplibregl-ctrl-group button {
          background: transparent !important;
          border: none !important;
        }
        
        .maplibregl-ctrl-group button:hover {
          background: rgba(255, 255, 255, 0.1) !important;
        }
        
        .maplibregl-ctrl-group button span {
          filter: invert(1);
        }
        
        @keyframes alertPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
        }
        
        @keyframes selectedPulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.2); }
        }
      `}</style>
    </div>
  );
}
