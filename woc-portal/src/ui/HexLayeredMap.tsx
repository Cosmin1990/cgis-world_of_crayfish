// ======================= MapComponent =======================

import React, { useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { latLngToCell, cellToBoundary } from 'h3-js';
import 'leaflet/dist/leaflet.css';
import GeoLocation from '../model/GeoLocation';

interface MapComponentProps {
  latitude?: number;
  longitude?: number;
  points: GeoLocation[];
}

const MapComponent = React.memo(({ latitude, longitude, points }: MapComponentProps) => {
  // H3 fixed hexagonal grid binning
  const h3GeoJSON = useMemo(() => {
    const resolution = 3; // Adjust: 6=larger hexes, 8=smaller/finer
    const hexCounts = new Map<string, number>();

    (Array.isArray(points) ? points : []).forEach((p) => {
      const lat = p.latitude;
      const lng = p.longitude;
      const index = latLngToCell(lat, lng, resolution);
      hexCounts.set(index, (hexCounts.get(index) || 0) + 1);
      console.log("Location:" + lat + ":" + lng)
      console.log(hexCounts.size);
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
    density > 50 ? '#d32f2f' :
    density > 20  ? '#ff5722' :
    density > 10  ? '#ff9800' :
    density > 5   ? '#ffc107' : '#a8d8ea';

  return {
    fillColor,
    weight: 1,
    opacity: 1,
    color: 'white',
    fillOpacity: 0.7,
  };
};

  return (
    <MapContainer
      center={[45.0, 24.65] as L.LatLngExpression}
      zoom={6}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {/* <GeoJSON data={h3GeoJSON} style={hexStyle} />
       */}
       <GeoJSON key={points.length} data={h3GeoJSON} style={hexStyle} />

      {/* Optional marker */}
      {/* {latitude && longitude && <Marker position={[latitude, longitude]} />} */}
    </MapContainer>
  );
});

export default MapComponent;