// ======================= MapComponent =======================

import React, { useMemo, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  LayersControl,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { latLngToCell, cellToBoundary } from 'h3-js';
import 'leaflet/dist/leaflet.css';
import GeoLocation from '../model/GeoLocation';
import * as toGeoJSON from '@tmcw/togeojson';

interface MapComponentProps {
  latitude?: number;
  longitude?: number;
  points?: GeoLocation[];
  AOOObject?: any;
  BasinObject?: any;
  EOOObject?: any;
}

/* ======================= HELPERS ======================= */

// 🔑 parse GeoJSON OR KML string safely
function normalizeGeoData(input?: any) {
  if (!input) return undefined;

  if (typeof input === 'string') {
    try {
      // JSON GeoJSON
      return JSON.parse(input);
    } catch {
      try {
        // KML
        const doc = new DOMParser().parseFromString(input, 'text/xml');
        return toGeoJSON.kml(doc);
      } catch (e) {
        console.error('Invalid geo data:', e);
        return undefined;
      }
    }
  }

  // already object
  return input;
}

// ======================= GeoJSON style =======================
const geoJsonStyle = (feature?: any): L.PathOptions => {
  const props = feature?.properties || {};
  return {
    color: props.stroke || '#3388ff',
    weight: props['stroke-width'] ?? 1.5,
    fillColor: props.fill || '#3388ff',
    fillOpacity: props['fill-opacity'] ?? 0.4,
  };
};

// ======================= FIT MAP =======================
function FitToGeoJSON({ data }: { data?: any }) {
  const map = useMap();

  useEffect(() => {
    if (!data) return;

    const layer = L.geoJSON(data);
    const bounds = layer.getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [data, map]);

  return null;
}

// ======================= INVALIDATE SIZE =======================
function InvalidateSize() {
  const map = useMap();

  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 300);
    return () => clearTimeout(t);
  }, [map]);

  return null;
}


function CtrlScrollZoom() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        // 🔒 blocăm scroll-ul paginii
        e.preventDefault();
        e.stopPropagation();

        // ✅ activăm zoom pe hartă
        map.scrollWheelZoom.enable();
      } else {
        map.scrollWheelZoom.disable();
      }
    };

    container.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", onWheel);
    };
  }, [map]);

  return null;
}


/* ======================= COMPONENT ======================= */

const MapComponent = React.memo(
  ({ points, AOOObject, BasinObject, EOOObject }: MapComponentProps) => {

    // 🔑 NORMALIZE DATA HERE
    const AOO = useMemo(() => normalizeGeoData(AOOObject), [AOOObject]);
    const Basin = useMemo(() => normalizeGeoData(BasinObject), [BasinObject]);
    const EOO = useMemo(() => normalizeGeoData(EOOObject), [EOOObject]);

    // Fit priority
    const fitTarget = Basin || AOO || EOO;

    return (
      <>
        <style>{`.leaflet-control-layers label { text-align: left !important; }`}</style>

        <MapContainer
          center={[45.0, 24.65]}
          zoom={6}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          <LayersControl position="topright">

            {AOO && (
              <LayersControl.Overlay checked={false} name="AOO">
  <GeoJSON
    key={AOO ? JSON.stringify(AOO).length : "AOO-empty"}
    data={AOO}
    style={geoJsonStyle}
  />
</LayersControl.Overlay>
            )}

            {Basin && (
              <LayersControl.Overlay checked name="Basins">
  <GeoJSON
    key={Basin ? JSON.stringify(Basin).length : "Basin-empty"}
    data={Basin}
    style={geoJsonStyle}
  />
</LayersControl.Overlay>
            )}

            {EOO && (
              <LayersControl.Overlay checked={false} name="EOO">
  <GeoJSON
    key={EOO ? JSON.stringify(EOO).length : "EOO-empty"}
    data={EOO}
    style={geoJsonStyle}
  />
</LayersControl.Overlay>
            )}

          </LayersControl>

          <InvalidateSize />
          <FitToGeoJSON data={fitTarget} />
          <CtrlScrollZoom />
        </MapContainer>
      </>
    );
  }
);

export default MapComponent;
