import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, Bike, CalendarDays, Camera, Check, Clock3, Footprints,
  Flame, MapPin, Medal, Pencil, Route, Sparkles, Target, Trophy, X
} from "lucide-react";
import api from "../lib/api";

type ProfileDetails = {
  name: string;
  location: string;
  bio: string;
  photo: string;
};

type ActivityRecord = {
  id: string;
  type: "Running" | "Cycling" | "Walking" | string;
  distance: number;
  duration: number;
  date: string;
};

type ApiUser = {
  name?: string;
  location?: string | null;
  bio?: string | null;
  photoUrl?: string | null;
  photo?: string | null;
};

const DEFAULT_PROFILE: ProfileDetails = {
  name: "PaceOrbit Athlete",
  location: "",
  bio: "Every move tells a story. Building consistency, one activity at a time.",
  photo: "",
};

const CITY_SUGGESTIONS = [
  "Mumbai", "Pune", "Nashik", "Nagpur", "Dhule", "Thane",
  "Chhatrapati Sambhajinagar", "Kolhapur", "Solapur", "Jalgaon",
  "Vapi", "Valsad", "Surat", "Vadodara", "Ahmedabad", "Rajkot",
  "Gandhinagar", "Anand", "Bharuch", "Navsari", "Bhavnagar",
  "Delhi", "New Delhi", "Bengaluru", "Hyderabad", "Chennai",
  "Kolkata", "Jaipur", "Udaipur", "Indore", "Bhopal", "Goa",
  "Panaji", "Lucknow", "Kanpur", "Chandigarh", "Dehradun",
  "Kochi", "Thiruvananthapuram", "Coimbatore", "Mysuru",
  "Mangaluru", "Amritsar", "Ludhiana", "Patna", "Ranchi",
  "Bhubaneswar", "Guwahati", "Visakhapatnam", "Vijayawada",
];

function durationLabel(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2)
    .map(part => part[0]?.toUpperCase() || "").join("") || "PA";
}

function getStreak(records: ActivityRecord[]) {
  const activeDates = new Set(records.map(item => {
    const date = new Date(item.date);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  }));

  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!activeDates.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  while (activeDates.has(cursor.getTime())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default function ProfileDashboard() {
  const [profile, setProfile] = useState<ProfileDetails>(DEFAULT_PROFILE);
  const [records, setRecords] = useState<ActivityRecord[]>([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProfileDetails>(DEFAULT_PROFILE);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfileAndActivities() {
      try {
        setLoading(true);
        setError("");

        const [profileResult, activitiesResult] = await Promise.all([
          api.get("/auth/me"),
          api.get("/activities"),
        ]);

        if (cancelled) return;

        const rawUser: ApiUser =
          profileResult.data?.user ?? profileResult.data?.data?.user ?? profileResult.data?.data ?? profileResult.data;

        const nextProfile: ProfileDetails = {
          name: rawUser?.name || DEFAULT_PROFILE.name,
          location: rawUser?.location || "",
          bio: rawUser?.bio || DEFAULT_PROFILE.bio,
          photo: rawUser?.photoUrl || rawUser?.photo || "",
        };

        const activityList = activitiesResult.data?.activities;
        setProfile(nextProfile);
        setDraft(nextProfile);
        setRecords(Array.isArray(activityList) ? activityList : []);
      } catch (err) {
        console.error("Unable to load PaceOrbit profile:", err);
        if (!cancelled) setError("Some profile information could not be loaded. Please refresh and try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProfileAndActivities();
    return () => { cancelled = true; };
  }, []);

  const totalDistance = records.reduce((sum, item) => sum + Number(item.distance || 0), 0);
  const totalDuration = records.reduce((sum, item) => sum + Number(item.duration || 0), 0);
  const totalActivities = records.length;
  const longest = records.reduce((best, item) => Math.max(best, Number(item.distance || 0)), 0);
  const streak = getStreak(records);

  const monthlyDistance = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return records
      .filter(item => new Date(item.date) >= start)
      .reduce((sum, item) => sum + Number(item.distance || 0), 0);
  }, [records]);

  const activityCounts = useMemo(() => ({
    Running: records.filter(item => item.type === "Running").length,
    Cycling: records.filter(item => item.type === "Cycling").length,
    Walking: records.filter(item => item.type === "Walking").length,
  }), [records]);

  const recent = useMemo(() => [...records]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4), [records]);

  const achievements = [
    { title: "First step", detail: "Save your first activity", earned: totalActivities >= 1, icon: Footprints, tone: "sage" },
    { title: "On the move", detail: "Complete 5 activities", earned: totalActivities >= 5, icon: Activity, tone: "coral" },
    { title: "Distance maker", detail: "Cover 10 km in total", earned: totalDistance >= 10, icon: Route, tone: "lavender" },
    { title: "Consistency", detail: "Build a 3-day activity streak", earned: streak >= 3, icon: Flame, tone: "coral" },
    { title: "Long run", detail: "Complete a 5 km activity", earned: longest >= 5, icon: Trophy, tone: "sage" },
    { title: "All-rounder", detail: "Try all 3 activity types", earned: Object.values(activityCounts).every(count => count > 0), icon: Medal, tone: "lavender" },
  ];

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2800);
  };

  const saveProfile = async () => {
    const cleaned = {
      ...draft,
      name: draft.name.trim() || DEFAULT_PROFILE.name,
      location: draft.location.trim(),
      bio: draft.bio.trim(),
    };

    try {
      setSaving(true);
      const response = await api.patch("/auth/me", {
        name: cleaned.name,
        location: cleaned.location,
        bio: cleaned.bio,
        photoUrl: cleaned.photo,
      });

      const updatedUser: ApiUser =
        response.data?.user ?? response.data?.data?.user ?? response.data?.data ?? response.data;

      const savedProfile = {
        ...cleaned,
        name: updatedUser?.name || cleaned.name,
        location: updatedUser?.location ?? cleaned.location,
        bio: updatedUser?.bio ?? cleaned.bio,
        photo: updatedUser?.photoUrl || updatedUser?.photo || cleaned.photo,
      };

      setProfile(savedProfile);
      setDraft(savedProfile);
      setEditing(false);
      showNotice("Profile saved to your account");
    } catch (err) {
      console.error("Unable to save profile:", err);
      showNotice("Unable to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handlePhoto = (file?: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showNotice("Please choose an image file.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      showNotice("Choose an image under 3 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const updated = { ...profile, photo: String(reader.result || "") };
      try {
        await api.patch("/auth/me", { photoUrl: updated.photo });
        setProfile(updated);
        setDraft(updated);
        showNotice("Profile photo saved to your account");
      } catch (err) {
        console.error("Unable to save profile photo:", err);
        showNotice("Photo could not be saved. Please try again.");
      }
    };
    reader.readAsDataURL(file);
  };

  const openEditor = () => {
    setDraft(profile);
    setEditing(true);
  };

  return (
    <section className="profile-page">
      <div className="profile-page-heading">
        <div>
          <div className="eyebrow"><Sparkles size={14} /> YOUR PACEORBIT IDENTITY</div>
          <h1>Your profile<span>.</span></h1>
          <p>A snapshot of your movement, milestones and consistency.</p>
        </div>
        <button className="profile-edit-button" onClick={openEditor}>
          <Pencil size={15} /> Edit profile
        </button>
      </div>

      {loading && <p className="dashboard-status">Loading your profile and activity statistics...</p>}
      {error && <p className="dashboard-error">{error}</p>}

      <div className="profile-hero-card">
        <div className="profile-hero-glow" />
        <div className="profile-identity">
          <div className="profile-avatar-wrap">
            {profile.photo
              ? <img src={profile.photo} alt="Profile" className="profile-photo" />
              : <div className="profile-initials">{initials(profile.name)}</div>}
            <button
              className="profile-camera-button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload profile photo"
              title="Upload profile photo"
            >
              <Camera size={15} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={event => {
                handlePhoto(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
          </div>

          <div className="profile-identity-copy">
            <span className="profile-member-label"><span /> PACEORBIT MEMBER</span>
            <h2>{profile.name}</h2>
            <p><MapPin size={13} /> {profile.location || "Add your location"}</p>
            <p className="profile-bio">{profile.bio}</p>
          </div>
        </div>

        <div className="profile-hero-footer">
          <span><CalendarDays size={14} /> Your PaceOrbit account</span>
          <button onClick={openEditor}>Personalise profile <Pencil size={13} /></button>
        </div>
      </div>

      <div className="profile-stat-grid">
        <div className="profile-stat-card">
          <div className="profile-stat-icon coral"><Route size={19} /></div>
          <span>TOTAL DISTANCE</span>
          <strong>{totalDistance.toFixed(2)} <small>KM</small></strong>
        </div>
        <div className="profile-stat-card">
          <div className="profile-stat-icon lavender"><Activity size={19} /></div>
          <span>ACTIVITIES</span>
          <strong>{totalActivities}</strong>
        </div>
        <div className="profile-stat-card">
          <div className="profile-stat-icon sage"><Clock3 size={19} /></div>
          <span>MOVING TIME</span>
          <strong>{durationLabel(totalDuration)}</strong>
        </div>
        <div className="profile-stat-card">
          <div className="profile-stat-icon coral"><Flame size={19} /></div>
          <span>CURRENT STREAK</span>
          <strong>{streak} <small>{streak === 1 ? "DAY" : "DAYS"}</small></strong>
        </div>
      </div>

      <div className="profile-content-grid">
        <div className="profile-panel profile-performance-panel">
          <div className="profile-panel-heading">
            <div><div className="eyebrow">THIS MONTH</div><h2>Your performance</h2></div>
            <span className="profile-month-tag">
              {new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
            </span>
          </div>

          <div className="profile-monthly-highlight">
            <div><span>MONTHLY DISTANCE</span><strong>{monthlyDistance.toFixed(2)} <small>KM</small></strong></div>
            <div className="profile-target-icon"><Target size={22} /></div>
          </div>

          <div className="profile-sport-list">
            <div className="profile-sport-row"><span className="profile-sport-icon running"><Activity size={16} /></span><span>Running</span><strong>{activityCounts.Running}</strong></div>
            <div className="profile-sport-row"><span className="profile-sport-icon cycling"><Bike size={16} /></span><span>Cycling</span><strong>{activityCounts.Cycling}</strong></div>
            <div className="profile-sport-row"><span className="profile-sport-icon walking"><Footprints size={16} /></span><span>Walking</span><strong>{activityCounts.Walking}</strong></div>
          </div>

          <p className="profile-data-note">Statistics are calculated from activities saved to your PaceOrbit account.</p>
        </div>

        <div className="profile-panel profile-record-panel">
          <div className="profile-panel-heading">
            <div><div className="eyebrow">PERSONAL RECORD</div><h2>Biggest distance</h2></div>
            <Trophy size={20} className="profile-record-trophy" />
          </div>
          <div className="profile-record-number">{longest.toFixed(2)} <small>KM</small></div>
          <p>Your longest single recorded activity.</p>
          <div className="profile-record-divider" />
          <div className="profile-record-meta"><span>MONTHLY DISTANCE</span><strong>{monthlyDistance.toFixed(2)} km</strong></div>
          <div className="profile-record-meta"><span>ACTIVE DAYS</span><strong>{new Set(records.map(item => new Date(item.date).toDateString())).size}</strong></div>
        </div>
      </div>

      <div className="profile-panel profile-achievements-panel">
        <div className="profile-panel-heading">
          <div><div className="eyebrow">KEEP SHOWING UP</div><h2>Achievements</h2></div>
          <span className="profile-achievement-count">
            {achievements.filter(item => item.earned).length}/{achievements.length} UNLOCKED
          </span>
        </div>
        <div className="profile-achievement-grid">
          {achievements.map(item => {
            const Icon = item.icon;
            return (
              <div className={`profile-achievement ${item.earned ? "earned" : "locked"}`} key={item.title}>
                <div className={`profile-achievement-icon ${item.tone}`}><Icon size={19} /></div>
                <div><strong>{item.title}</strong><span>{item.detail}</span></div>
                <span className="profile-achievement-check">{item.earned ? <Check size={14} /> : "LOCKED"}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="profile-panel profile-recent-panel">
        <div className="profile-panel-heading">
          <div><div className="eyebrow">LATEST MOVEMENT</div><h2>Recent activities</h2></div>
          <span className="profile-recent-count">{recent.length} SHOWN</span>
        </div>

        {recent.length ? (
          <div className="profile-recent-list">
            {recent.map(item => {
              const Icon = item.type === "Cycling" ? Bike : item.type === "Walking" ? Footprints : Activity;
              return (
                <div className="profile-recent-row" key={item.id}>
                  <div className={`profile-recent-icon ${item.type.toLowerCase()}`}><Icon size={18} /></div>
                  <div className="profile-recent-main">
                    <strong>{item.type}</strong>
                    <span>{new Date(item.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                  <div className="profile-recent-distance"><strong>{Number(item.distance || 0).toFixed(2)}</strong><span>KM</span></div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="profile-no-activities">
            <Footprints size={24} />
            <strong>Your first activity is waiting.</strong>
            <span>Record a run, ride or walk to start building your profile.</span>
          </div>
        )}
      </div>

      {notice && <div className="profile-toast"><Check size={15} /> {notice}</div>}

      {editing && (
        <div
          className="profile-edit-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setEditing(false);
          }}
        >
          <div className="profile-edit-modal" role="dialog" aria-modal="true" aria-labelledby="profile-edit-title">
            <div className="profile-edit-heading">
              <div><div className="eyebrow">MAKE IT YOURS</div><h2 id="profile-edit-title">Edit profile</h2></div>
              <button onClick={() => setEditing(false)} aria-label="Close"><X size={19} /></button>
            </div>

            <label>
              Display name
              <input
                value={draft.name}
                maxLength={40}
                onChange={event => setDraft({ ...draft, name: event.target.value })}
                placeholder="Your name"
              />
            </label>

            <label>
              Location
              <input
                list="paceorbit-city-options"
                value={draft.location}
                maxLength={60}
                onChange={event => setDraft({ ...draft, location: event.target.value })}
                placeholder="Search your city..."
                autoComplete="off"
              />
              <datalist id="paceorbit-city-options">
                {CITY_SUGGESTIONS.map(city => <option key={city} value={city} />)}
              </datalist>
              <span className="profile-location-hint">Start typing to see city suggestions, or enter your own location.</span>
            </label>

            <label>
              About you
              <textarea
                value={draft.bio}
                maxLength={150}
                rows={3}
                onChange={event => setDraft({ ...draft, bio: event.target.value })}
                placeholder="A short introduction"
              />
            </label>

            <div className="profile-edit-actions">
              <button className="profile-cancel-button" onClick={() => setEditing(false)}>Cancel</button>
              <button className="profile-save-button" onClick={() => void saveProfile()} disabled={saving}>
                <Check size={15} /> {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
