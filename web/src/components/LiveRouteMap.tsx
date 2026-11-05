import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface LiveRouteMapProps {
  position: [number, number] | null;
  routePoints: [number, number][];
}

function MapUpdater({
  position,
  routePoints,
}: {
  position: [number, number] | null;
  routePoints: [number, number][];
}) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.flyTo(position, 17, { duration: 1.2 });
      return;
    }

    if (routePoints.length > 1) {
      map.fitBounds(routePoints, { padding: [28, 28], maxZoom: 16 });
    } else if (routePoints.length === 1) {
      map.setView(routePoints[0], 16);
    }
  }, [position, routePoints, map]);

  return null;
}

export default function LiveRouteMap({ position, routePoints }: LiveRouteMapProps) {
  const defaultCenter: [number, number] = [20.5937, 78.9629];

  return (
    <div className="paceorbit-live-map">
      <MapContainer
        center={position || routePoints[0] || defaultCenter}
        zoom={position || routePoints.length ? 16 : 5}
        scrollWheelZoom
        zoomControl
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapUpdater position={position} routePoints={routePoints} />

        {routePoints.length > 1 && (
          <Polyline
            positions={routePoints}
            pathOptions={{
              color: "#F18A65",
              weight: 6,
              opacity: 0.9,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        )}

        {position && (
          <>
            <CircleMarker
              center={position}
              radius={19}
              pathOptions={{ color: "#F18A65", fillColor: "#F18A65", fillOpacity: 0.18, weight: 1 }}
            />
            <CircleMarker
              center={position}
              radius={8}
              pathOptions={{ color: "#FFFFFF", weight: 3, fillColor: "#9180C5", fillOpacity: 1 }}
            />
          </>
        )}

        {routePoints.length > 0 && (
          <>
            <CircleMarker
              center={routePoints[0]}
              radius={6}
              pathOptions={{ color: "#FFFFFF", fillColor: "#D8E8E5", fillOpacity: 1, weight: 2 }}
            />
            {routePoints.length > 1 && (
              <CircleMarker
                center={routePoints[routePoints.length - 1]}
                radius={6}
                pathOptions={{ color: "#FFFFFF", fillColor: "#F18A65", fillOpacity: 1, weight: 2 }}
              />
            )}
          </>
        )}
      </MapContainer>

      {!position && routePoints.length === 0 && (
        <div className="paceorbit-map-loading">
          <span>Waiting for GPS location...</span>
        </div>
      )}
    </div>
  );
}
