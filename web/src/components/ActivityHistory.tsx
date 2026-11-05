import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowLeft, Bike, CalendarDays, Clock3, Footprints,
  Gauge, MapPin, Route, Search, Trash2, Trophy
} from "lucide-react";
import LiveRouteMap from "./LiveRouteMap";
import api from "../lib/api";

type FilterType = "All" | "Running" | "Cycling" | "Walking";
type PeriodFilter = "All time" | "Last 30 days" | "This month";

type ActivityRecord = {
  id: string;
  type: "Running" | "Cycling" | "Walking" | string;
  distance: number;
  duration: number;
  date: string;
  userId?: string;
  speed?: number | null;
  pace?: string | null;
  routePoints?: [number, number][] | null;
};

function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remaining = safe % 60;
  return hours > 0
    ? `${hours}h ${minutes}m`
    : `${minutes}m ${remaining}s`;
}

function formatDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Date unavailable";
  return parsed.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPaceOrSpeed(item: ActivityRecord) {
  if (item.type === "Cycling") {
    return item.speed && item.speed > 0 ? `${item.speed.toFixed(1)} km/h` : "—";
  }
  return item.pace && item.pace !== "--:--" ? `${item.pace} /km` : "—";
}

export default function ActivityHistory() {
  const [records, setRecords] = useState<ActivityRecord[]>([]);
  const [filter, setFilter] = useState<FilterType>("All");
  const [period, setPeriod] = useState<PeriodFilter>("All time");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ActivityRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadActivities() {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/activities");
      const list = response.data?.activities;
      setRecords(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Unable to load activity history:", err);
      setError("We couldn't load your activity history. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadActivities();
  }, []);

  const filteredRecords = useMemo(() => {
    const now = new Date();
    let cutoff: Date | null = null;

    if (period === "Last 30 days") {
      cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 30);
    } else if (period === "This month") {
      cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return records
      .filter(item => filter === "All" || item.type === filter)
      .filter(item => !cutoff || new Date(item.date) >= cutoff)
      .filter(item => {
        const query = search.trim().toLowerCase();
        return !query || `${item.type} ${formatDate(item.date)}`.toLowerCase().includes(query);
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, filter, period, search]);

  const totalDistance = records.reduce((sum, item) => sum + Number(item.distance || 0), 0);
  const totalDuration = records.reduce((sum, item) => sum + Number(item.duration || 0), 0);
  const longestActivity = records.reduce((longest, item) => Math.max(longest, Number(item.distance || 0)), 0);

  async function deleteActivity(id: string) {
    const confirmed = window.confirm("Delete this activity permanently? This cannot be undone.");
    if (!confirmed) return;

    try {
      setDeletingId(id);
      await api.delete(`/activities/${id}`);
      setRecords(previous => previous.filter(item => item.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (err) {
      console.error("Unable to delete activity:", err);
      window.alert("Unable to delete this activity. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  if (selected) {
    const routePoints = Array.isArray(selected.routePoints) ? selected.routePoints : [];
    const hasRoute = routePoints.length > 0;
    const Icon = selected.type === "Cycling" ? Bike : selected.type === "Walking" ? Footprints : Activity;

    return (
      <section className="history-page history-detail-page">
        <button className="history-back-button" onClick={() => setSelected(null)}>
          <ArrowLeft size={17} /> Back to activities
        </button>

        <div className="history-heading history-detail-heading">
          <div>
            <div className="eyebrow"><Icon size={14} /> ACTIVITY DETAILS</div>
            <h1>{selected.type}<span>.</span></h1>
            <p><CalendarDays size={14} /> {formatDate(selected.date)}</p>
          </div>
          <span className={`history-detail-status ${hasRoute ? "has-route" : "no-route"}`}>
            <span /> {hasRoute ? "GPS route saved" : "No GPS route"}
          </span>
        </div>

        <div className={`history-detail-map ${hasRoute ? "" : "is-empty"}`}>
          {hasRoute ? (
            <LiveRouteMap position={routePoints[routePoints.length - 1]} routePoints={routePoints} />
          ) : (
            <div className="history-no-route">
              <div className="history-no-route-icon"><MapPin size={25} /></div>
              <strong>No GPS route recorded</strong>
              <span>This activity was saved without GPS route points. Your workout statistics are still available below.</span>
            </div>
          )}
        </div>

        <div className="history-detail-stats">
          <div className="history-detail-primary">
            <span>DISTANCE</span>
            <strong>{Number(selected.distance || 0).toFixed(2)} <small>KM</small></strong>
          </div>
          <div className="history-detail-stat">
            <span>DURATION</span>
            <strong>{formatDuration(selected.duration)}</strong>
          </div>
          <div className="history-detail-stat">
            <span>{selected.type === "Cycling" ? "AVG. SPEED" : "AVG. PACE"}</span>
            <strong>{getPaceOrSpeed(selected)}</strong>
          </div>
        </div>

        <div className="history-detail-footer">
          <div><Route size={17} /><span>{routePoints.length} GPS route {routePoints.length === 1 ? "point" : "points"}</span></div>
          <button
            className="history-delete"
            onClick={() => void deleteActivity(selected.id)}
            disabled={deletingId === selected.id}
            aria-label="Delete activity"
            title="Delete activity"
          >
            <Trash2 size={17} />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="history-page">
      <div className="history-heading">
        <div>
          <div className="eyebrow"><Activity size={14} /> YOUR FITNESS JOURNEY</div>
          <h1>Every move tells a story<span>.</span></h1>
          <p>All your recorded adventures, together in one place.</p>
        </div>
      </div>

      <div className="history-stats">
        <div className="history-stat-card">
          <div className="history-stat-icon coral"><Route size={20} /></div>
          <span>TOTAL DISTANCE</span>
          <strong>{totalDistance.toFixed(2)} <small>KM</small></strong>
        </div>
        <div className="history-stat-card">
          <div className="history-stat-icon lavender"><Clock3 size={20} /></div>
          <span>MOVING TIME</span>
          <strong>{formatDuration(totalDuration)}</strong>
        </div>
        <div className="history-stat-card">
          <div className="history-stat-icon sage"><Trophy size={20} /></div>
          <span>LONGEST ACTIVITY</span>
          <strong>{longestActivity.toFixed(2)} <small>KM</small></strong>
        </div>
        <div className="history-stat-card">
          <div className="history-stat-icon lavender"><Activity size={20} /></div>
          <span>ACTIVITIES</span>
          <strong>{records.length}</strong>
        </div>
      </div>

      <div className="history-list-section">
        <div className="history-list-heading">
          <div>
            <div className="eyebrow">YOUR COLLECTION</div>
            <h2>Activity history</h2>
          </div>
          <span className="history-count">{filteredRecords.length} ACTIVITIES</span>
        </div>

        <div className="history-toolbar" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between", margin: "18px 0" }}>
          <div className="history-filters">
            {(["All", "Running", "Cycling", "Walking"] as FilterType[]).map(item => (
              <button
                key={item}
                className={`history-filter ${filter === item ? "active" : ""}`}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid rgba(48,43,67,.14)", borderRadius: 12, padding: "9px 12px", background: "rgba(255,255,255,.7)" }}>
              <Search size={15} />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search activities"
                aria-label="Search activities"
                style={{ border: 0, outline: 0, background: "transparent", width: 145, minWidth: 0 }}
              />
            </label>
            <select
              value={period}
              onChange={event => setPeriod(event.target.value as PeriodFilter)}
              aria-label="Filter by date"
              style={{ border: "1px solid rgba(48,43,67,.14)", borderRadius: 12, padding: "9px 12px", background: "rgba(255,255,255,.7)", color: "#302B43" }}
            >
              <option>All time</option>
              <option>Last 30 days</option>
              <option>This month</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="history-empty">
            <div className="history-empty-icon"><Activity size={28} /></div>
            <h3>Loading your adventures...</h3>
            <p>Gathering your recorded activities.</p>
          </div>
        ) : error ? (
          <div className="history-empty">
            <h3>Activity history unavailable</h3>
            <p>{error}</p>
            <button className="history-filter active" onClick={() => void loadActivities()}>Try again</button>
          </div>
        ) : filteredRecords.length > 0 ? (
          <div className="history-records">
            {filteredRecords.map(item => {
              const Icon = item.type === "Cycling" ? Bike : item.type === "Walking" ? Footprints : Activity;
              const hasRoute = Boolean(item.routePoints?.length);

              return (
                <article
                  className="history-record history-record-clickable"
                  key={item.id}
                  onClick={() => setSelected(item)}
                  onKeyDown={event => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelected(item);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className={`history-record-icon ${item.type === "Running" ? "coral" : item.type === "Cycling" ? "lavender" : "sage"}`}>
                    <Icon size={23} />
                  </div>
                  <div className="history-record-main">
                    <strong>{item.type}</strong>
                    <span><CalendarDays size={12} /> {formatDate(item.date)}</span>
                    <span className={hasRoute ? "history-route-label" : "history-missing-route-label"}>
                      <MapPin size={12} /> {hasRoute ? "GPS route recorded" : "No GPS route saved"}
                    </span>
                  </div>
                  <div className="history-record-metrics">
                    <div><strong>{Number(item.distance || 0).toFixed(2)}</strong><small>KM</small></div>
                    <span><Clock3 size={12} /> {formatDuration(item.duration)}</span>
                    <span><Gauge size={12} /> {getPaceOrSpeed(item)}</span>
                  </div>
                  <button
                    className="history-delete"
                    onClick={event => {
                      event.stopPropagation();
                      void deleteActivity(item.id);
                    }}
                    disabled={deletingId === item.id}
                    aria-label={`Delete ${item.type} activity`}
                    title="Delete activity"
                  >
                    <Trash2 size={17} />
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="history-empty">
            <div className="history-empty-icon"><Footprints size={30} /></div>
            <h3>{records.length === 0 ? "Your journey starts here." : "No activities found."}</h3>
            <p>
              {records.length === 0
                ? "Complete your first GPS activity and it will appear here."
                : "Try changing your search, activity type or date filter."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
