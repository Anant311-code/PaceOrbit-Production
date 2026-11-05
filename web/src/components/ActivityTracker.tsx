import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import LiveRouteMap from "./LiveRouteMap";
import {
  Activity, Bike, CheckCircle2, Footprints, LocateFixed, MapPin,
  Pause, Play, RotateCcw, Timer, X, Zap, Navigation, RefreshCw
} from "lucide-react";

export type ActivityType = "Running" | "Cycling" | "Walking";

export interface ActivitySplit {
  kilometer: number;
  duration: number;
  pace: string;
}

export interface CompletedActivity {
  id: number;
  type: ActivityType;
  distance: number;
  duration: number;
  pace: string;
  speed: string;
  date: string;
  latitude?: number;
  longitude?: number;
  routePoints?: [number, number][];
  splits?: ActivitySplit[];
}

interface ActivityTrackerProps {
  onClose: () => void;
  onFinish: (activity: CompletedActivity) => Promise<void>;
  initialType?: ActivityType;
}

interface GPSPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

type TrackerStatus = "select" | "locating" | "ready" | "running" | "paused" | "finished";

const toRadians = (degrees: number) => degrees * (Math.PI / 180);

function calculateDistance(a: GPSPoint, b: GPSPoint) {
  const earthRadius = 6371000;
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLon = toRadians(b.longitude - a.longitude);
  const value = Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [hours, minutes, secs].map(value => String(value).padStart(2, "0")).join(":");
}

function formatPace(seconds: number, kilometers: number) {
  if (kilometers < 0.05) return "--:--";
  const pace = Math.round(seconds / kilometers);
  return `${Math.floor(pace / 60)}:${String(pace % 60).padStart(2, "0")}`;
}

const activityOptions = [
  { type: "Running" as ActivityType, label: "Run", icon: Footprints, detail: "Track your running distance and pace." },
  { type: "Walking" as ActivityType, label: "Walk", icon: Activity, detail: "A relaxed walk, one step at a time." },
  { type: "Cycling" as ActivityType, label: "Ride", icon: Bike, detail: "Record your ride, speed and distance." },
];

export default function ActivityTracker({
  onClose,
  onFinish,
  initialType = "Running",
}: ActivityTrackerProps) {
  const [activityType, setActivityType] = useState<ActivityType>(initialType);
  const [status, setStatus] = useState<TrackerStatus>("select");
  const [distance, setDistance] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [location, setLocation] = useState<GPSPoint | null>(null);
  const [gpsError, setGpsError] = useState("");
  const [gpsReady, setGpsReady] = useState(false);
  const [locationLabel, setLocationLabel] = useState("Waiting for GPS signal");
  const [locationLoading, setLocationLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [splits, setSplits] = useState<ActivitySplit[]>([]);

  const watchId = useRef<number | null>(null);
  const previousPoint = useRef<GPSPoint | null>(null);
  const totalDistance = useRef(0);
  const splitDistance = useRef(0);
  const splitStartElapsed = useRef(0);
  const splitNumber = useRef(1);
  const splitsRef = useRef<ActivitySplit[]>([]);
  const startedAt = useRef<number | null>(null);
  const elapsedBeforePause = useRef(0);
  const finalActivity = useRef<CompletedActivity | null>(null);
  const recordingRef = useRef(false);
  const lastGeocode = useRef<{ latitude: number; longitude: number; accuracy: number; timestamp: number } | null>(null);

  const stopGPS = useCallback(() => {
    if (watchId.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  const updateLocationName = useCallback(async (point: GPSPoint) => {
    const previous = lastGeocode.current;
    if (previous) {
      const moved = calculateDistance(previous, point);
      const elapsedSinceLookup = Date.now() - previous.timestamp;
      if (moved < 100 && elapsedSinceLookup < 30000) return;
    }

    lastGeocode.current = {
      latitude: point.latitude,
      longitude: point.longitude,
      accuracy: point.accuracy,
      timestamp: Date.now(),
    };
    setLocationLoading(true);

    try {
      const params = new URLSearchParams({
        lat: String(point.latitude), lon: String(point.longitude), lang: "en",
      });
      const response = await fetch(`https://photon.komoot.io/reverse?${params.toString()}`);
      if (!response.ok) throw new Error("Location lookup failed");
      const data = await response.json();
      const properties = data.features?.[0]?.properties;
      if (!properties) {
        setLocationLabel("Nearby place not found");
        return;
      }
      const locality = properties.city || properties.town || properties.village || properties.county || properties.suburb;
      const parts = [locality, properties.state, properties.country].filter(
        (value, index, array) => value && array.indexOf(value) === index
      );
      setLocationLabel(parts.length ? parts.join(", ") : "Location detected");
    } catch {
      setLocationLabel("Place lookup unavailable");
    } finally {
      setLocationLoading(false);
    }
  }, []);

  const startGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("Your browser does not support GPS location.");
      return false;
    }
    if (!window.isSecureContext) {
      setGpsError("GPS requires HTTPS or localhost. Open PaceOrbit using a secure connection.");
      return false;
    }

    setGpsError("");
    setGpsReady(false);
    try {
      watchId.current = navigator.geolocation.watchPosition(
        position => {
          const point: GPSPoint = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          setAccuracy(point.accuracy);
          setLocation(point);
          if (point.accuracy <= 50) void updateLocationName(point);

          // A good GPS fix enables Start; it never starts the timer automatically.
          setGpsReady(point.accuracy <= 35);
          if (point.accuracy <= 35) {
            setStatus(current => current === "locating" ? "ready" : current);
          }

          // GPS acquisition does not count distance. Count only after user taps Start.
          if (!recordingRef.current) {
            previousPoint.current = point;
            return;
          }
          if (point.accuracy > 35) return;
          const previous = previousPoint.current;
          if (!previous) {
            previousPoint.current = point;
            return;
          }
          const gap = (point.timestamp - previous.timestamp) / 1000;
          const meters = calculateDistance(previous, point);
          const speed = gap > 0 ? meters / gap : 0;
          const maxSpeed = activityType === "Cycling" ? 25 : 12;
          const valid = gap > 0 && gap <= 30 && meters >= 2 && speed <= maxSpeed;
          if (valid) {
            const previousElapsed = startedAt.current === null
              ? elapsedBeforePause.current
              : elapsedBeforePause.current + (previous.timestamp - startedAt.current) / 1000;
            const currentElapsed = startedAt.current === null
              ? elapsedBeforePause.current
              : elapsedBeforePause.current + (point.timestamp - startedAt.current) / 1000;

            // Split a GPS segment at each exact 1 km boundary (interpolated).
            let remainingMeters = meters;
            let segmentConsumed = 0;
            while (splitDistance.current + remainingMeters >= 1000) {
              const needed = 1000 - splitDistance.current;
              segmentConsumed += needed;
              const ratio = meters > 0 ? segmentConsumed / meters : 1;
              const boundaryElapsed = previousElapsed + (currentElapsed - previousElapsed) * ratio;
              const splitDuration = Math.max(1, Math.round(boundaryElapsed - splitStartElapsed.current));
              const nextSplit: ActivitySplit = {
                kilometer: splitNumber.current,
                duration: splitDuration,
                pace: formatPace(splitDuration, 1),
              };
              splitsRef.current = [...splitsRef.current, nextSplit];
              setSplits(splitsRef.current);
              splitNumber.current += 1;
              splitStartElapsed.current = boundaryElapsed;
              remainingMeters -= needed;
              splitDistance.current = 0;
            }
            splitDistance.current += remainingMeters;

            totalDistance.current += meters;
            setDistance(totalDistance.current / 1000);
            setRoutePoints(previous => [
              ...previous,
              [point.latitude, point.longitude],
            ]);
            previousPoint.current = point;
          }
        },
        error => {
          const messages: Record<number, string> = {
            1: "Location permission denied. Allow location access in your browser settings.",
            2: "GPS signal unavailable. Try moving to an open area.",
            3: "GPS request timed out. Still waiting for a fresh GPS fix.",
          };
          setGpsError(messages[error.code] || "Unable to access GPS.");
          setGpsReady(false);
        },
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 }
      );
      return true;
    } catch {
      setGpsError("Could not initialize GPS tracking.");
      return false;
    }
  }, [activityType, updateLocationName]);

  const beginGPSAcquisition = (type: ActivityType) => {
    stopGPS();
    setActivityType(type);
    setGpsError("");
    setGpsReady(false);
    setAccuracy(null);
    setLocation(null);
    setLocationLabel("Finding your location...");
    setDistance(0);
    setElapsed(0);
    totalDistance.current = 0;
    splitDistance.current = 0;
    splitStartElapsed.current = 0;
    splitNumber.current = 1;
    splitsRef.current = [];
    setSplits([]);
    setRoutePoints([]);
    elapsedBeforePause.current = 0;
    previousPoint.current = null;
    recordingRef.current = false;
    lastGeocode.current = null;
    setStatus("locating");
    if (!startGPS()) setStatus("select");
  };

  const startRecording = () => {
    if (!gpsReady || !location || location.accuracy > 35) return;
    setGpsError("");
    previousPoint.current = location;
setRoutePoints([[location.latitude, location.longitude]]);
recordingRef.current = true;
    startedAt.current = Date.now();
    setElapsed(elapsedBeforePause.current);
    setStatus("running");
  };

  const pauseActivity = () => {
    if (startedAt.current !== null) {
      elapsedBeforePause.current += Math.floor((Date.now() - startedAt.current) / 1000);
    }
    startedAt.current = null;
    recordingRef.current = false;
    previousPoint.current = null;
    stopGPS();
    setStatus("paused");
  };

  const resumeActivity = () => {
    setGpsError("");
    previousPoint.current = null;
    recordingRef.current = true;
    if (!startGPS()) {
      recordingRef.current = false;
      return;
    }
    startedAt.current = Date.now();
    setStatus("running");
  };

  const finishActivity = () => {
    if (startedAt.current !== null) {
      elapsedBeforePause.current += Math.floor((Date.now() - startedAt.current) / 1000);
      startedAt.current = null;
    }
    recordingRef.current = false;
    stopGPS();
    const totalSeconds = elapsedBeforePause.current;
    const kilometers = totalDistance.current / 1000;
    const activity: CompletedActivity = {
      id: Date.now(),
      type: activityType,
      distance: Number(kilometers.toFixed(3)),
      duration: totalSeconds,
      pace: formatPace(totalSeconds, kilometers),
      speed: totalSeconds > 0 ? ((kilometers / totalSeconds) * 3600).toFixed(1) : "0.0",
      date: new Date().toISOString(),
      latitude: location?.latitude,
      longitude: location?.longitude,
      routePoints: [...routePoints],
      splits: [...splitsRef.current],
    };
    finalActivity.current = activity;
    setElapsed(totalSeconds);
    setStatus("finished");
  };

  const saveActivity = async () => {
  if (!finalActivity.current || saving) return;

  setSaving(true);
  setGpsError("");

  try {
    await onFinish(finalActivity.current);
  } catch {
    setGpsError("Unable to save activity. Please try again.");
    setSaving(false);
  }
};
  const resetTracker = () => {
    stopGPS();
    recordingRef.current = false;
    previousPoint.current = null;
    totalDistance.current = 0;
    splitDistance.current = 0;
    splitStartElapsed.current = 0;
    splitNumber.current = 1;
    splitsRef.current = [];
    setSplits([]);
    startedAt.current = null;
    elapsedBeforePause.current = 0;
    finalActivity.current = null;
    lastGeocode.current = null;
    setDistance(0);
    setElapsed(0);
    setLocation(null);
    setAccuracy(null);
    setGpsReady(false);
    setLocationLabel("Waiting for GPS signal");
    setLocationLoading(false);
    setGpsError("");
    setSaving(false);
    setStatus("select");
  };

  const backToSelection = () => {
    stopGPS();
    recordingRef.current = false;
    previousPoint.current = null;
    setGpsReady(false);
    setGpsError("");
    setStatus("select");
  };

  useEffect(() => {
    if (status !== "running") return;
    const updateTimer = () => {
      if (startedAt.current !== null) {
        setElapsed(elapsedBeforePause.current + Math.floor((Date.now() - startedAt.current) / 1000));
      }
    };
    updateTimer();
    const timer = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => () => {
    recordingRef.current = false;
    stopGPS();
  }, [stopGPS]);

  const kilometers = distance.toFixed(2);
  const pace = formatPace(elapsed, distance);
  const speed = elapsed > 0 ? ((distance / elapsed) * 3600).toFixed(1) : "0.0";
  const isActive = status === "running" || status === "paused";

  return (
    <AnimatePresence>
      <motion.div
        className="tracker-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={status === "select" || status === "finished" ? onClose : undefined}
      >
        <motion.div
          className="tracker-modal"
          initial={{ opacity: 0, y: 25, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20 }}
          onClick={event => event.stopPropagation()}
        >
          <div className="tracker-header">
            <div>
              <div className="eyebrow">PACEORBIT · ACTIVITY STUDIO</div>
              <h2>
                {status === "select" ? "Choose your workout" :
                  status === "locating" ? "Finding your place." :
                  status === "ready" ? "You're all set." :
                  status === "finished" ? "Beautiful effort." :
                  
                  status === "paused" ? "Take your time." : "You're in motion."}
              </h2>
            </div>
            <button className="tracker-close" onClick={() => {
              if (status === "running") pauseActivity(); else stopGPS();
              onClose();
            }} aria-label="Close tracker"><X size={20} /></button>
          </div>

          {status === "select" && (
            <div className="tracker-sport-list">
              {activityOptions.map(option => {
                const OptionIcon = option.icon;
                return (
                  <motion.div className={`tracker-sport-card ${activityType === option.type ? "selected" : ""}`} key={option.type} whileTap={{ scale: 0.985 }}>
                    <button className="tracker-sport-heading" onClick={() => setActivityType(option.type)}>
                      <span className="tracker-sport-icon"><OptionIcon size={27} /></span>
                      <span className="tracker-sport-copy"><strong>{option.label}</strong><small>{option.detail}</small></span>
                      <span className="tracker-sport-chevron">›</span>
                    </button>
                    <button className="tracker-sport-start" onClick={() => beginGPSAcquisition(option.type)}>
                      <Play size={19} fill="currentColor" /> Start
                    </button>
                  </motion.div>
                );
              })}
              <button className="tracker-more-sports" type="button" onClick={() => setGpsError("More sports will be available in a future PaceOrbit update.")}>More sports</button>
              {gpsError && <div className="tracker-error" role="alert">{gpsError}</div>}
            </div>
          )}

          {(status === "locating" || status === "ready") && (
            <div className="tracker-ready-screen">
              <div className="tracker-map-preview">
                <div className="tracker-map-grid" />
                <div className="tracker-map-road tracker-map-road-one" />
                <div className="tracker-map-road tracker-map-road-two" />
                <div className="tracker-map-road tracker-map-road-three" />
                <div className="tracker-map-pin"><span /></div>
                <div className="tracker-map-location-pill"><MapPin size={14} />{locationLoading ? "Finding nearby place..." : locationLabel}</div>
                <button className="tracker-map-recenter" onClick={() => {
                  if (status === "ready") {
                    setGpsReady(false);
                    setStatus("locating");
                    stopGPS();
                    startGPS();
                  }
                }} aria-label="Refresh GPS location"><LocateFixed size={19} /></button>
              </div>

              <div className={`tracker-gps-readiness ${gpsReady ? "is-ready" : ""}`}>
                <span className={`gps-status-dot ${gpsReady ? "connected" : ""}`} />
                <div>
                  <strong>{gpsReady ? "GPS signal acquired" : "Acquiring GPS signal..."}</strong>
                  <small>{accuracy !== null ? `Current accuracy: ${Math.round(accuracy)} metres` : "Move to an open area for a stronger signal"}</small>
                </div>
                {gpsReady ? <CheckCircle2 size={21} /> : <RefreshCw size={19} className="tracker-spin" />}
              </div>
              {gpsError && <div className="tracker-error" role="alert">{gpsError}</div>}
              <div className="tracker-ready-actions">
                <button className="tracker-reset" onClick={backToSelection}>Change activity</button>
                <button className="tracker-primary" onClick={startRecording} disabled={!gpsReady || !location || location.accuracy > 35}>
                  <Play size={19} fill="currentColor" /> Start recording
                </button>
              </div>
              <p className="tracker-ready-note">Your timer and distance start only when you tap Start recording.</p>
              <div className="tracker-map-attribution">Place information © OpenStreetMap contributors · Photon</div>
            </div>
          )}

          {isActive && (
            <>
              <div className="tracker-live-status"><span className={`gps-status-dot ${gpsReady ? "connected" : ""}`} />{gpsReady ? `GPS signal detected · ${accuracy?.toFixed(0)}m accuracy` : "Searching for GPS signal..."}</div>
              <div className="tracker-stats">
                <div className="tracker-main-stat"><span>DISTANCE</span><strong>{kilometers}</strong><small>KM</small></div>
                <div className="tracker-secondary-stats">
                  <div><Timer size={19} /><span>TIME</span><strong>{formatTime(elapsed)}</strong></div>
                  <div><Zap size={19} /><span>{activityType === "Cycling" ? "SPEED" : "PACE"}</span><strong>{activityType === "Cycling" ? speed : pace}</strong><small>{activityType === "Cycling" ? "KM/H" : "/KM"}</small></div>
                </div>
              </div>
              <div className="tracker-route-map-wrap">
                <LiveRouteMap
                  position={location ? [location.latitude, location.longitude] : null}
                  routePoints={routePoints}
                />
              </div>
              {splits.length > 0 && (
                <div className="tracker-splits-panel">
                  <div className="tracker-splits-heading">
                    <strong>Kilometer splits</strong>
                    <span>{splits.length} completed</span>
                  </div>
                  <div className="tracker-splits-list">
                    {splits.slice(-3).reverse().map(split => (
                      <div className="tracker-split-row" key={split.kilometer}>
                        <span>KM {split.kilometer}</span>
                        <strong>{formatTime(split.duration)}</strong>
                        <small>{split.pace} /km</small>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="tracker-location-card">
                <div className="tracker-location-icon"><Navigation size={20} /></div>
                <div><strong>{locationLoading ? "Updating location..." : locationLabel}</strong><p>{location ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : "Waiting for GPS coordinates"}</p></div>
              </div>
              {gpsError && <div className="tracker-error" role="alert">{gpsError}</div>}
              <div className="tracker-controls">
                {status === "running" ? <button className="tracker-pause" onClick={pauseActivity}><Pause size={19} fill="currentColor" /> Pause</button> : <button className="tracker-primary" onClick={resumeActivity}><Play size={19} fill="currentColor" /> Resume</button>}
                <button className="tracker-finish" onClick={finishActivity}>Finish activity</button>
              </div>
            </>
          )}

          {status === "finished" && finalActivity.current && (
            <div className="tracker-finished">
              <div className="tracker-success-icon"><CheckCircle2 size={38} /></div>
              <div className="tracker-finished-title">{activityType} completed!</div>
              <div className="tracker-finished-distance">{kilometers} <small>KM</small></div>
              <div className="tracker-finish-grid">
                <div><span>DURATION</span><strong>{formatTime(elapsed)}</strong></div>
                <div><span>{activityType === "Cycling" ? "AVERAGE SPEED" : "AVERAGE PACE"}</span><strong>{activityType === "Cycling" ? `${speed} km/h` : `${pace} /km`}</strong></div>
              </div>
              {routePoints.length > 1 && (
                <div className="tracker-replay-section">
                  <strong>Route replay</strong>
                  <div className="tracker-route-map-wrap">
                    <LiveRouteMap position={null} routePoints={routePoints} />
                  </div>
                </div>
              )}
              {splits.length > 0 && (
                <div className="tracker-splits-panel tracker-finished-splits">
                  <div className="tracker-splits-heading">
                    <strong>Kilometer splits</strong>
                    <span>{splits.length} completed</span>
                  </div>
                  <div className="tracker-splits-list">
                    {splits.map(split => (
                      <div className="tracker-split-row" key={split.kilometer}>
                        <span>KM {split.kilometer}</span>
                        <strong>{formatTime(split.duration)}</strong>
                        <small>{split.pace} /km</small>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="tracker-finish-note">Your activity is ready to be saved to PaceOrbit.</p>
              {gpsError && (
  <div className="tracker-error" role="alert">
    {gpsError}
  </div>
)}
              <button className="tracker-primary" onClick={saveActivity} disabled={saving}><CheckCircle2 size={18} />{saving ? "Saving..." : "Save activity"}</button>
              <button className="tracker-reset" onClick={resetTracker}><RotateCcw size={15} /> Start another activity</button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
