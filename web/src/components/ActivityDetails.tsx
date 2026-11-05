import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bike, CalendarDays, Clock3, Footprints, Gauge, MapPin, Route, Timer } from "lucide-react";
import { CircleMarker, MapContainer, Polyline, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import api from "../lib/api";

type ActivityRecord = {
  id: string;
  type: "Running" | "Cycling" | "Walking" | string;
  distance: number;
  duration: number;
  pace: string | null;
  speed: number | null;
  date: string;
  routePoints?: [number, number][] | null;
};

type ActivityDetailsProps = {
  activityId: string;
  onBack: () => void;
};

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }

  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function formatPace(activity: ActivityRecord) {
  if (activity.type === "Cycling") {
    return activity.speed && activity.speed > 0
      ? `${activity.speed.toFixed(1)} km/h`
      : "--";
  }

  if (activity.pace) return activity.pace;

  if (activity.distance > 0 && activity.duration > 0) {
    const secondsPerKm = activity.duration / activity.distance;
    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.round(secondsPerKm % 60);
    return `${minutes}:${String(seconds).padStart(2, "0")} /km`;
  }

  return "--";
}

export default function ActivityDetails({ activityId, onBack }: ActivityDetailsProps) {
  const [activity, setActivity] = useState<ActivityRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadActivity() {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(`/activities/${activityId}`);
        const record = response.data?.activity ?? response.data;

        if (!cancelled) {
          setActivity(record as ActivityRecord);
        }
      } catch (err) {
        console.error("Unable to load activity details:", err);
        if (!cancelled) {
          setError("We couldn't load this activity. Please go back and try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadActivity();

    return () => {
      cancelled = true;
    };
  }, [activityId]);

  const routePoints = useMemo(() => {
    if (!Array.isArray(activity?.routePoints)) return [];

    return activity.routePoints.filter(
      (point): point is [number, number] =>
        Array.isArray(point) &&
        point.length >= 2 &&
        Number.isFinite(Number(point[0])) &&
        Number.isFinite(Number(point[1]))
    );
  }, [activity?.routePoints]);

  if (loading) {
    return (
      <section className="activity-details-page">
        <button className="text-button" onClick={onBack}>
          <ArrowLeft size={16} /> Back to activities
        </button>
        <div className="activity-details-state">Loading your activity details...</div>
      </section>
    );
  }

  if (error || !activity) {
    return (
      <section className="activity-details-page">
        <button className="text-button" onClick={onBack}>
          <ArrowLeft size={16} /> Back to activities
        </button>
        <div className="activity-details-state">
          <h2>Activity unavailable</h2>
          <p>{error || "This activity could not be found."}</p>
        </div>
      </section>
    );
  }

  const ActivityIcon = activity.type === "Cycling" ? Bike : Footprints;
  const formattedDate = new Date(activity.date).toLocaleString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const mapCenter: [number, number] =
    routePoints.length > 0 ? routePoints[Math.floor(routePoints.length / 2)] : [20.3974, 72.8328];

  return (
    <section className="activity-details-page" style={{ maxWidth: 1120, margin: "0 auto", padding: "12px 0 40px" }}>
      <button className="text-button" onClick={onBack} style={{ marginBottom: 22 }}>
        <ArrowLeft size={16} /> Back to recent adventures
      </button>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 18,
          marginBottom: 24,
        }}
      >
        <div>
          <div className="eyebrow"><ActivityIcon size={14} /> YOUR ACTIVITY</div>
          <h1 style={{ margin: "10px 0 8px", fontSize: "clamp(30px, 5vw, 46px)" }}>
            {activity.type}
          </h1>
          <p style={{ display: "flex", alignItems: "center", gap: 8, opacity: 0.72, margin: 0 }}>
            <CalendarDays size={16} /> {formattedDate}
          </p>
        </div>
        <div className="goal-icon" style={{ width: 54, height: 54 }}>
          <ActivityIcon size={25} />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 14,
          marginBottom: 22,
        }}
      >
        {[
          { label: "DISTANCE", value: `${activity.distance.toFixed(2)} km`, icon: Route },
          { label: "DURATION", value: formatDuration(activity.duration), icon: Clock3 },
          { label: activity.type === "Cycling" ? "AVERAGE SPEED" : "AVERAGE PACE", value: formatPace(activity), icon: Gauge },
        ].map((metric) => {
          const MetricIcon = metric.icon;
          return (
            <div
              key={metric.label}
              style={{
                background: "var(--card, #fff)",
                border: "1px solid rgba(48,43,67,.10)",
                borderRadius: 20,
                padding: "20px",
                minHeight: 118,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: .68, fontSize: 11, letterSpacing: 1.1, fontWeight: 700 }}>
                <MetricIcon size={15} /> {metric.label}
              </div>
              <div style={{ fontSize: "clamp(23px, 3vw, 30px)", fontWeight: 750, marginTop: 16, color: "#302B43" }}>
                {metric.value}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          background: "var(--card, #fff)",
          border: "1px solid rgba(48,43,67,.10)",
          borderRadius: 24,
          padding: 16,
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "4px 4px 15px" }}>
          <MapPin size={18} />
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>Your route</h2>
            <p style={{ margin: "3px 0 0", opacity: .65, fontSize: 13 }}>
              {routePoints.length > 1 ? `${routePoints.length} GPS points recorded` : "Route information"}
            </p>
          </div>
        </div>

        {routePoints.length > 1 ? (
          <MapContainer
            center={mapCenter}
            zoom={15}
            scrollWheelZoom={false}
            style={{ height: 360, width: "100%", borderRadius: 16, zIndex: 1 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Polyline positions={routePoints} pathOptions={{ color: "#F18A65", weight: 5, opacity: .9 }} />
            <CircleMarker center={routePoints[0]} radius={7} pathOptions={{ color: "#fff", weight: 3, fillColor: "#6EAD91", fillOpacity: 1 }} />
            <CircleMarker center={routePoints[routePoints.length - 1]} radius={7} pathOptions={{ color: "#fff", weight: 3, fillColor: "#F18A65", fillOpacity: 1 }} />
          </MapContainer>
        ) : (
          <div
            style={{
              minHeight: 230,
              borderRadius: 16,
              background: "#F5F0E9",
              display: "grid",
              placeItems: "center",
              textAlign: "center",
              padding: 24,
              color: "#514A63",
            }}
          >
            <div>
              <MapPin size={28} />
              <h3 style={{ margin: "10px 0 6px" }}>No GPS route available</h3>
              <p style={{ margin: 0, fontSize: 13, maxWidth: 360 }}>
                This activity has no saved GPS route points. Its workout statistics are still available above.
              </p>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, opacity: .65, fontSize: 12 }}>
        <Timer size={14} /> Recorded with PaceOrbit
      </div>
    </section>
  );
}
