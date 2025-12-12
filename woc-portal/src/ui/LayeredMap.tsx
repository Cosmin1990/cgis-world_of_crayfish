// ======================= MapComponent =======================

import React, { useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import { latLngToCell, cellToBoundary } from 'h3-js';
import 'leaflet/dist/leaflet.css';
import GeoLocation from '../model/GeoLocation';
import * as toGeoJSON from '@tmcw/togeojson';

interface MapComponentProps {
  latitude?: number;
  longitude?: number;
  points: GeoLocation[];
}

const MapComponent = React.memo(({ latitude, longitude, points }: MapComponentProps) => {

  //=================================== GeoJSON polygonal layer ============================================================
  // Convert a GeoJSON string into an object
  function parseGeoJsonString(geojsonString: string) {
    try {
      return JSON.parse(geojsonString);
    } catch (e) {
      console.error("Invalid GeoJSON string", e);
      return null;
    }
  }

  // Convert a KML string into GeoJSON
  function parseKmlString(kmlString: string) {
    try {
      const doc = new DOMParser().parseFromString(kmlString, "text/xml");
      return toGeoJSON.kml(doc);
    } catch (e) {
      console.error("Invalid KML string", e);
      return null;
    }
  }
  
  const testGeoJsonString = "{\n\"type\": \"FeatureCollection\",\n\"name\": \"Austropotamobius_bihariensis_AOO\",\n\"crs\": { \"type\": \"name\", \"properties\": { \"name\": \"urn:ogc:def:crs:OGC:1.3:CRS84\" } },\n\"features\": [\n{ \"type\": \"Feature\", \"properties\": { \"Name\": \"Austropotamobius bihariensis AOO\", \"fill\": \"#FFFF00\", \"fill.opacity\": 0.2, \"stroke\": \"#FFFF00\", \"stroke.width\": 2.0 }, \"geometry\": { \"type\": \"MultiPolygon\", \"coordinates\": [ [ [ [ 22.22013023, 46.56 ], [ 22.23813023, 46.56 ], [ 22.23813023, 46.578 ], [ 22.22013023, 46.578 ], [ 22.22013023, 46.56 ] ] ], [ [ [ 22.52613023, 46.596 ], [ 22.54413023, 46.596 ], [ 22.54413023, 46.614 ], [ 22.52613023, 46.614 ], [ 22.52613023, 46.596 ] ] ], [ [ [ 22.54413023, 46.524 ], [ 22.56213023, 46.524 ], [ 22.56213023, 46.542 ], [ 22.54413023, 46.542 ], [ 22.54413023, 46.524 ] ] ], [ [ [ 22.58013023, 46.542 ], [ 22.59813023, 46.542 ], [ 22.59813023, 46.56 ], [ 22.58013023, 46.56 ], [ 22.58013023, 46.542 ] ] ], [ [ [ 22.50813023, 46.668 ], [ 22.52613023, 46.668 ], [ 22.52613023, 46.686 ], [ 22.50813023, 46.686 ], [ 22.50813023, 46.668 ] ] ], [ [ [ 22.88613023, 46.722 ], [ 22.90413023, 46.722 ], [ 22.90413023, 46.74 ], [ 22.88613023, 46.74 ], [ 22.88613023, 46.722 ] ] ], [ [ [ 22.65213023, 46.596 ], [ 22.67013023, 46.596 ], [ 22.67013023, 46.614 ], [ 22.65213023, 46.614 ], [ 22.65213023, 46.596 ] ] ], [ [ [ 22.22013023, 46.632 ], [ 22.23813023, 46.632 ], [ 22.23813023, 46.65 ], [ 22.22013023, 46.65 ], [ 22.22013023, 46.632 ] ] ], [ [ [ 22.25613023, 46.47 ], [ 22.27413023, 46.47 ], [ 22.27413023, 46.488 ], [ 22.25613023, 46.488 ], [ 22.25613023, 46.47 ] ] ], [ [ [ 22.45413023, 46.416 ], [ 22.47213023, 46.416 ], [ 22.47213023, 46.434 ], [ 22.45413023, 46.434 ], [ 22.45413023, 46.416 ] ] ], [ [ [ 22.23813023, 46.434 ], [ 22.25613023, 46.434 ], [ 22.27413023, 46.434 ], [ 22.27413023, 46.452 ], [ 22.25613023, 46.452 ], [ 22.23813023, 46.452 ], [ 22.23813023, 46.434 ] ] ], [ [ [ 22.90413023, 46.47 ], [ 22.92213023, 46.47 ], [ 22.92213023, 46.488 ], [ 22.90413023, 46.488 ], [ 22.90413023, 46.47 ] ] ], [ [ [ 22.72413023, 46.488 ], [ 22.74213023, 46.488 ], [ 22.74213023, 46.506 ], [ 22.72413023, 46.506 ], [ 22.72413023, 46.488 ] ] ], [ [ [ 22.50813023, 46.47 ], [ 22.52613023, 46.47 ], [ 22.52613023, 46.488 ], [ 22.50813023, 46.488 ], [ 22.50813023, 46.47 ] ] ], [ [ [ 22.58013023, 46.47 ], [ 22.59813023, 46.47 ], [ 22.59813023, 46.488 ], [ 22.58013023, 46.488 ], [ 22.58013023, 46.47 ] ] ], [ [ [ 22.85013023, 46.92 ], [ 22.86813023, 46.92 ], [ 22.86813023, 46.938 ], [ 22.85013023, 46.938 ], [ 22.85013023, 46.92 ] ] ], [ [ [ 22.90413023, 46.974 ], [ 22.92213023, 46.974 ], [ 22.92213023, 46.992 ], [ 22.90413023, 46.992 ], [ 22.90413023, 46.974 ] ] ], [ [ [ 22.54413023, 46.848 ], [ 22.56213023, 46.848 ], [ 22.56213023, 46.866 ], [ 22.54413023, 46.866 ], [ 22.54413023, 46.848 ] ] ], [ [ [ 22.79613023, 46.848 ], [ 22.81413023, 46.848 ], [ 22.81413023, 46.866 ], [ 22.79613023, 46.866 ], [ 22.79613023, 46.848 ] ] ], [ [ [ 22.52613023, 47.046 ], [ 22.54413023, 47.046 ], [ 22.54413023, 47.064 ], [ 22.52613023, 47.064 ], [ 22.52613023, 47.046 ] ] ], [ [ [ 22.59813023, 47.1 ], [ 22.61613023, 47.1 ], [ 22.61613023, 47.118 ], [ 22.61613023, 47.136 ], [ 22.59813023, 47.136 ], [ 22.59813023, 47.118 ], [ 22.59813023, 47.1 ] ] ], [ [ [ 22.36413023, 46.776 ], [ 22.38213023, 46.776 ], [ 22.38213023, 46.794 ], [ 22.36413023, 46.794 ], [ 22.36413023, 46.776 ] ] ], [ [ [ 22.88613023, 46.776 ], [ 22.90413023, 46.776 ], [ 22.90413023, 46.794 ], [ 22.88613023, 46.794 ], [ 22.88613023, 46.776 ] ] ], [ [ [ 22.54413023, 46.74 ], [ 22.56213023, 46.74 ], [ 22.56213023, 46.758 ], [ 22.54413023, 46.758 ], [ 22.54413023, 46.74 ] ] ], [ [ [ 22.56213023, 46.758 ], [ 22.58013023, 46.758 ], [ 22.58013023, 46.776 ], [ 22.56213023, 46.776 ], [ 22.56213023, 46.758 ] ] ], [ [ [ 22.65213023, 46.83 ], [ 22.67013023, 46.83 ], [ 22.67013023, 46.848 ], [ 22.65213023, 46.848 ], [ 22.65213023, 46.83 ] ] ], [ [ [ 22.41813023, 46.848 ], [ 22.43613023, 46.848 ], [ 22.43613023, 46.866 ], [ 22.41813023, 46.866 ], [ 22.41813023, 46.848 ] ] ], [ [ [ 22.41813023, 46.794 ], [ 22.43613023, 46.794 ], [ 22.43613023, 46.812 ], [ 22.41813023, 46.812 ], [ 22.41813023, 46.794 ] ] ], [ [ [ 22.36413023, 46.83 ], [ 22.38213023, 46.83 ], [ 22.38213023, 46.848 ], [ 22.36413023, 46.848 ], [ 22.36413023, 46.83 ] ] ], [ [ [ 23.04813023, 46.398 ], [ 23.06613023, 46.398 ], [ 23.06613023, 46.416 ], [ 23.04813023, 46.416 ], [ 23.04813023, 46.398 ] ] ], [ [ [ 22.34613023, 46.416 ], [ 22.36413023, 46.416 ], [ 22.36413023, 46.434 ], [ 22.34613023, 46.434 ], [ 22.34613023, 46.416 ] ] ] ] } }\n]\n}";
  
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
      // console.log("Location:" + lat + ":" + lng)
      // console.log(hexCounts.size);
    });

    const features = Array.from(hexCounts.entries()).map(([index, count]) => {
    // const boundary = cellToBoundary(index, true); // GeoJSON coordinates ([lng, lat]) — correct for the GeoJSON layer
    const rawBoundary = cellToBoundary(index, true); // supposedly [lng, lat] ... but it is NOT
    const boundary = rawBoundary.map(([a, b]) => [b, a]); // force swap
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
  const hexStyle: L.PathOptions | ((feature?: GeoJSON.Feature) => L.PathOptions) = (feature?: GeoJSON.Feature) => {
    const density = (feature?.properties as { density?: number } | undefined)?.density ?? 0;

    const fillColor =
      density > 300 ? '#7f0000' :   // very dark red
      density > 250 ? '#990000' :   // deep red
      density > 200 ? '#b30000' :   // strong red
      density > 150 ? '#cc0000' :   // medium‑strong red
      density > 100 ? '#e60000' :   // bright red
      density > 50  ? '#ff3300' :   // red‑orange
      density > 20  ? '#ff6600' :   // medium orange
      density > 10  ? '#ff9933' :
      density > 5   ? '#ffcc80' : '#f2fccaff';

    return {
      fillColor,
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7,
    };
  };
  //========================================================================================================================


  return (
    <>
      <style>{`.leaflet-control-layers label {text-align: left !important;}`}</style>

      <MapContainer center={[45.0, 24.65] as L.LatLngExpression} zoom={6} style={{ height: '100%', width: '100%' }}>
      {/* MAP */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      <LayersControl position="topright">
          {/* Density Honeycomb */}
          <LayersControl.Overlay checked={false} name="Density Areas">
              <GeoJSON key={points.length} data={h3GeoJSON} style={hexStyle} />
          </LayersControl.Overlay>

          {/* AOO Layer */}
          <LayersControl.Overlay checked={false} name="AOO Layer (string)">
              <GeoJSON  data={parseGeoJsonString(testGeoJsonString)}  style={{color: "#FFFF00", weight: 2, fillColor: "#FFFF00",fillOpacity: 0.2,}}/>
          </LayersControl.Overlay>
      </LayersControl>
      </MapContainer>
      
    </>
  );
});

export default MapComponent;