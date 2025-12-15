// ======================= MapComponent =======================

import React, { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, LayersControl, useMap } from 'react-leaflet';
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

// ✅ helper: fits map to any GeoJSON object
function FitToGeoJSON({ data }: { data?: any }) {
  const map = useMap();

  useEffect(() => {
    if (!data) return;

    const layer = L.geoJSON(data);
    const bounds = layer.getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [30, 30],
        animate: true,
      });
    }
  }, [data, map]);

  return null;
}

const MapComponent = React.memo(
  ({ latitude, longitude, points, AOOObject, BasinObject, EOOObject }: MapComponentProps) => {
    //=================================== GeoJSON polygonal layer ============================================================
    // Convert a GeoJSON string into an object
    function parseGeoJsonString(geojsonString: string) {
      try {
        return JSON.parse(geojsonString);
      } catch (e) {
        console.error('Invalid GeoJSON string', e);
        return null;
      }
    }

    // Convert a KML string into GeoJSON
    function parseKmlString(kmlString: string) {
      try {
        const doc = new DOMParser().parseFromString(kmlString, 'text/xml');
        return toGeoJSON.kml(doc);
      } catch (e) {
        console.error('Invalid KML string', e);
        return null;
      }
    }

    //========================================================================================================================

    // ================================== DENSITY HONEYCOMB ==================================================================
    // H3 fixed hexagonal grid binning
    const h3GeoJSON = useMemo(() => {
      const resolution = 3; // Adjust: 6=larger hexes, 8=smaller/finer
      const hexCounts = new Map<string, number>();

      (Array.isArray(points) ? points : []).forEach((p) => {
        const lat = p.latitude;
        const lng = p.longitude;
        const index = latLngToCell(lat, lng, resolution);
        hexCounts.set(index, (hexCounts.get(index) || 0) + 1);
      });

      const features = Array.from(hexCounts.entries()).map(([index, count]) => {
        const rawBoundary = cellToBoundary(index, true); // returns [lat, lng] in practice here
        const boundary = rawBoundary.map(([a, b]) => [b, a]); // force swap to [lng, lat]

        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Polygon' as const,
            coordinates: [boundary],
          },
          properties: { density: count },
        };
      });

      return {
        type: 'FeatureCollection' as const,
        features,
      };
    }, [points]);

    // Style function for density coloring
    const hexStyle: L.PathOptions | ((feature?: GeoJSON.Feature) => L.PathOptions) = (
      feature?: GeoJSON.Feature
    ) => {
      const density = (feature?.properties as { density?: number } | undefined)?.density ?? 0;

      const fillColor =
        density > 300
          ? '#7f0000'
          : density > 250
          ? '#990000'
          : density > 200
          ? '#b30000'
          : density > 150
          ? '#cc0000'
          : density > 100
          ? '#e60000'
          : density > 50
          ? '#ff3300'
          : density > 20
          ? '#ff6600'
          : density > 10
          ? '#ff9933'
          : density > 5
          ? '#ffcc80'
          : '#f2fccaff';

      return {
        fillColor,
        weight: 1,
        opacity: 1,
        color: 'white',
        fillOpacity: 0.7,
      };
    };
    //========================================================================================================================

    // ✅ choose what to fit to (Basin first, then AOO, then EOO)
    const fitTarget = BasinObject || AOOObject || EOOObject;

    return (
      <>
        <style>{`.leaflet-control-layers label {text-align: left !important;}`}</style>

        <MapContainer
          center={[45.0, 24.65] as L.LatLngExpression}
          zoom={6}
          style={{ height: '100%', width: '100%' }}
        >
          {/* MAP */}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          <LayersControl position="topright">
            {/* Density Honeycomb */}
            {/* <LayersControl.Overlay checked={false} name="Density Areas">
              <GeoJSON key={points?.length ?? 0} data={h3GeoJSON} style={hexStyle} />
            </LayersControl.Overlay> */}

            {/* AOO Layer */}
            <LayersControl.Overlay checked={false} name="AOO Layer (string)">
              <GeoJSON
                key={AOOObject ? JSON.stringify(AOOObject) : 'empty-AOO'}
                data={AOOObject}
                style={{ color: '#FFFF00', weight: 2, fillColor: '#FFFF00', fillOpacity: 0.2 }}
              />
            </LayersControl.Overlay>

            {/* Basin Layer */}
            <LayersControl.Overlay checked={true} name="Basin Layer (string)">
              <GeoJSON
                key={BasinObject ? JSON.stringify(BasinObject) : 'empty-Basin'}
                data={BasinObject}
                style={{ color: '#001effff', weight: 2, fillColor: '#001effff', fillOpacity: 0.2 }}
              />
            </LayersControl.Overlay>

            {/* EOO Layer */}
            <LayersControl.Overlay checked={false} name="EOO Layer (string)">
              <GeoJSON
                key={EOOObject ? JSON.stringify(EOOObject) : 'empty-EOO'}
                data={EOOObject}
                style={{ color: '#00FF00', weight: 2, fillColor: '#00FF00', fillOpacity: 0.2 }}
              />
            </LayersControl.Overlay>
          </LayersControl>

          {/* ✅ Auto-center map around your data */}
          <FitToGeoJSON data={fitTarget} />
        </MapContainer>
      </>
    );
  }
);

export default MapComponent;
