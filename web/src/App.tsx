
import { useEffect, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowUpRight, Award, Bell,
  Bike, CalendarDays, Check, ChevronRight, Compass,
  Footprints, Heart, MapPin, Menu, MessageCircle,
  MoreHorizontal, Play, Plus, Search, Settings, Sparkles,
  Target, Timer, Trophy, Users, X, Zap
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis
} from "recharts";
import { AnimatePresence, motion } from "framer-motion";
import ExplorePage from "./components/ExplorePage";
import CommunityPage from "./components/CommunityPage";
import NotificationBell from "./components/NotificationBell";
import AchievementsPage from "./components/AchievementsPage";

import { useDashboardStats } from "./hooks/useDashboardStats";
import LeaderboardPage from "./components/LeaderboardPage";
import ChallengesPage from "./components/ChallengesPage";

import ActivityTracker, {
  type CompletedActivity
} from "./components/ActivityTracker";
import ActivityHistory from "./components/ActivityHistory";
import ActivityDetails from "./components/ActivityDetails";
import ProfileDashboard from "./components/ProfileDashboard";
import { useAuth } from "./context/AuthContext";
import AuthScreen from "./components/AuthScreen";
import {
  fetchActivities,
  saveActivity as createActivityRecord,
} from "./lib/activityService";
import api from "./lib/api";

import AchievementCelebration, {
  type UnlockedAchievement,
} from "./components/AchievementCelebration";


type Page =
  | "Home"
  | "Activities"
  | "Explore"
  | "Community"
  | "Leaderboard"
  | "Challenges"
  | "Achievements"
  | "Profile";
type FeedActivity = {
  id: number | string;
  type: string;
  location: string;
  date: string;
  distance: string;
  duration: string;
  pace: string;
  icon: typeof Footprints | typeof Bike;
  color: string;
  likes: number;
};


const navigation = [
  { name: "Home" as Page, icon: Activity },
  { name: "Activities" as Page, icon: Footprints },
  { name: "Explore" as Page, icon: Compass },
  { name: "Community" as Page, icon: Users },
  { name: "Leaderboard" as Page, icon: Trophy },
  { name: "Challenges" as Page, icon: Target },
  { name: "Profile" as Page, icon: Users },
  { name: "Achievements" as Page, icon: Award },
];

// Simplified navigation shown only in the mobile bottom bar.
const mobileNavigation = navigation.filter(item =>
  ["Home", "Activities", "Explore", "Community", "Profile"].includes(item.name)
);


function Logo() {
  return (
    <div className="brand">
      <div className="brand-mark">
        <Activity size={22} strokeWidth={2.5} />
      </div>
      <div>
        <div className="brand-name">PaceOrbit</div>
        <div className="brand-caption">FIND YOUR RHYTHM</div>
      </div>
    </div>
  );
}

function RouteIllustration() {
  return (
    <div className="route-visual" aria-label="Illustrative running route map">
      <div className="map-label map-label-one">RIVERSIDE</div>
      <div className="map-label map-label-two">PARK TRAIL</div>
      <div className="map-label map-label-three">CITY LOOP</div>

      <svg
        className="route-svg"
        viewBox="0 0 650 310"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Decorative route illustration"
      >
        <path
          d="M-20 80 C100 30 100 170 220 135 S330 35 420 110 S520 240 680 160"
          fill="none"
          stroke="#D5CDE6"
          strokeWidth="3"
          strokeDasharray="7 10"
        />
        <path
          d="M-20 80 C100 30 100 170 220 135 S330 35 420 110 S520 240 680 160"
          fill="none"
          stroke="#F18A65"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="400 1000"
        />
        <circle cx="0" cy="80" r="9" fill="#F18A65" stroke="#FFF8F2" strokeWidth="5" />
        <circle cx="650" cy="160" r="10" fill="#8270B6" stroke="#FFF8F2" strokeWidth="5" />
      </svg>

      <div className="map-start">
        <MapPin size={15} />
        START
      </div>
      <div className="map-end">
        <MapPin size={15} />
        FINISH
      </div>
      <div className="map-distance">5.24 KM</div>
      <div className="map-credit">ILLUSTRATIVE ROUTE PREVIEW</div>
    </div>
  );
}

function formatActivityDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;

  return hours > 0
    ? `${hours}h ${minutes}m`
    : `${minutes}:${String(remaining).padStart(2, "0")}`;
}
function parsePaceSeconds(pace: string): number | null {
  if (!pace || pace === "--:--" || pace.includes("km/h")) {
    return null;
  }

  const parts = pace.split(":").map(Number);

  if (parts.length !== 2 || parts.some(Number.isNaN)) {
    return null;
  }

  return parts[0] * 60 + parts[1];
}

function formatPace(seconds: number | null): string {
  if (seconds === null) return "--:--";

  const minutes = Math.floor(seconds / 60);
  const remaining = Math.round(seconds % 60);

  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}
function DashboardApp() {
  const { user, logout } = useAuth();
  

const {
  stats,
  loading: dashboardLoading,
  error: dashboardError,
  refreshActivities,
} = useDashboardStats();

const weeklyGoal = 40;
const goalProgress = Math.min(
  100,
  (stats.weeklyDistance / weeklyGoal) * 100
);
const remainingDistance = Math.max(
  0,
  weeklyGoal - stats.weeklyDistance
);


  const [page, setPage] = useState<Page>("Home");
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [liked, setLiked] = useState<(number | string)[]>([]);
  const [selectedActivity, setSelectedActivity] = useState("Running");
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  
const [savedActivities, setSavedActivities] = useState<FeedActivity[]>([]);
const allTimeLongest = savedActivities.reduce(
  (best, item) => Math.max(best, Number(item.distance || 0)),
  0
);

const paceEligibleActivities = savedActivities
  .filter(item => item.type !== "Cycling")
  .map(item => ({
    ...item,
    paceSeconds: parsePaceSeconds(item.pace),
  }))
  .filter(
    item =>
      item.paceSeconds !== null &&
      item.paceSeconds > 0
  );

const fastestOverall = paceEligibleActivities.reduce<number | null>(
  (best, item) =>
    best === null || item.paceSeconds! < best
      ? item.paceSeconds
      : best,
  null
);

const getBestPace = (minimumDistance: number): number | null => {
  const eligible = paceEligibleActivities.filter(
    item => Number(item.distance) >= minimumDistance
  );

  if (eligible.length === 0) return null;

  return eligible.reduce<number | null>(
    (best, item) =>
      best === null || item.paceSeconds! < best
        ? item.paceSeconds
        : best,
    null
  );
};
const currentMonth = new Date();

const monthlyActivities = savedActivities.filter((item) => {
  const activityDate = new Date(item.date);

  return (
    activityDate.getMonth() === currentMonth.getMonth() &&
    activityDate.getFullYear() === currentMonth.getFullYear()
  );
});

const monthlyDistance = monthlyActivities.reduce(
  (total, item) => total + Number(item.distance || 0),
  0
);

const longestActivity = monthlyActivities.reduce(
  (longest, item) => Math.max(longest, Number(item.distance || 0)),
  0
);

const averageDistance =
  monthlyActivities.length > 0
    ? monthlyDistance / monthlyActivities.length
    : 0;

const monthName = currentMonth.toLocaleDateString("en-US", {
  month: "long",
  year: "numeric",
});
const [newlyUnlockedAchievements, setNewlyUnlockedAchievements] =
  useState<UnlockedAchievement[]>([]);
useEffect(() => {
  let cancelled = false;

  async function loadActivities() {
    try {
      const records = await fetchActivities();

      if (cancelled) return;

      const formatted: FeedActivity[] = records.map(activity => ({
        id: activity.id,
        type: activity.type,
        location: "GPS recorded activity",
        date: new Date(activity.date).toLocaleString(),
        distance: activity.distance.toFixed(2),
        duration: formatActivityDuration(activity.duration),
        pace:
          activity.type === "Cycling"
            ? `${Number(activity.speed ?? 0).toFixed(1)} km/h`
            : activity.pace ?? "--:--",
        icon: activity.type === "Cycling" ? Bike : Footprints,
        color:
          activity.type === "Cycling"
            ? "lavender"
            : activity.type === "Walking"
              ? "sage"
              : "coral",
        likes: 0,
      }));

      setSavedActivities(formatted);
    } catch (error) {
      console.error("Unable to load activities:", error);
    }
  }

  void loadActivities();

  return () => {
    cancelled = true;
  };
}, []);



const saveCompletedActivity = async (activity: CompletedActivity) => {
  let previousAchievementIds = new Set<string>();
  let achievementSnapshotAvailable = false;

  // Capture achievements before saving the activity
  try {
    const response = await api.get("/achievements/mine");

    previousAchievementIds = new Set(
      (response.data.achievements ?? []).map(
        (item: { achievement: { id: string } }) =>
          item.achievement.id
      )
    );

    achievementSnapshotAvailable = true;
  } catch (error) {
    console.error("Unable to fetch previous achievements:", error);
  }

  try {
    // Save completed GPS activity
    const saved = await createActivityRecord({
  type: activity.type,
  distance: activity.distance,
  duration: activity.duration,
  pace: activity.pace,
  speed: Number(activity.speed),
  date: activity.date,
  routePoints: activity.routePoints ?? null,
  splits: activity.splits ?? [],
  
});
    // Detect newly unlocked achievements
    if (achievementSnapshotAvailable) {
      try {
        const response = await api.get("/achievements/mine");
        const currentAchievements = response.data.achievements ?? [];

        const newlyUnlocked = currentAchievements
          .filter(
            (item: { achievement: { id: string } }) =>
              !previousAchievementIds.has(item.achievement.id)
          )
          .map(
            (item: { achievement: UnlockedAchievement }) => ({
              id: item.achievement.id,
              key: item.achievement.key,
              name: item.achievement.name,
              description: item.achievement.description,
              icon: item.achievement.icon,
              points: item.achievement.points,
            })
          );

        if (newlyUnlocked.length > 0) {
          setNewlyUnlockedAchievements(newlyUnlocked);
        }
      } catch (error) {
        console.error("Unable to detect new achievements:", error);
      }
    }

    // Update home activity feed
    const feedItem: FeedActivity = {
      id: saved.id,
      type: saved.type,
      location: "GPS recorded activity",
      date: new Date(saved.date).toLocaleString(),
      distance: saved.distance.toFixed(2),
      duration: formatActivityDuration(saved.duration),
      pace:
        saved.type === "Cycling"
          ? `${Number(saved.speed ?? 0).toFixed(1)} km/h`
          : saved.pace ?? "--:--",
      icon: saved.type === "Cycling" ? Bike : Footprints,
      color:
        saved.type === "Cycling"
          ? "lavender"
          : saved.type === "Walking"
            ? "sage"
            : "coral",
      likes: 0,
    };

    setSavedActivities((previous) => [feedItem, ...previous]);

    await refreshActivities();
    setTrackingOpen(false);
  } catch (error) {
    console.error("Unable to save activity:", error);
    throw error;
  }
};



  
const filteredActivities = savedActivities.filter((item) =>
  `${item.type} ${item.location}`
    .toLowerCase()
    .includes(search.toLowerCase())
);


  const toggleLike = (id: number | string) => {
  setLiked(previous =>
    previous.includes(id)
      ? previous.filter(item => item !== id)
      : [...previous, id]
  );
};

  const changePage = (nextPage: Page) => {
    setPage(nextPage);
    setMobileMenuOpen(false);
  };

  return (
    <div className="pace-app">
      {/* TOP NAVIGATION */}

      <header className="top-header">
        <div className="header-inner">
          <Logo />

          <nav className="desktop-nav">
            {navigation.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  className={`nav-item ${page === item.name ? "selected" : ""}`}
                  onClick={() => changePage(item.name)}
                >
                  <Icon size={16} />
                  {item.name}
                </button>
              );
            })}
          </nav>

          <div className="header-right">
            <label className="search-field">
              <Search size={16} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Find an activity..."
              />
            </label>

            <NotificationBell />
            <button className="profile-avatar" onClick={() => changePage("Profile")}>
              AR
            </button>
            <button
  className="auth-logout-button"
  onClick={logout}
>
  Logout
</button>

            <button
              className="round-button mobile-menu-button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Open navigation"
            >
              {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              className="mobile-dropdown"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              {navigation.map(item => (
                <button key={item.name} onClick={() => changePage(item.name)}>
                  <item.icon size={17} />
                  {item.name}
                </button>
              ))}
              <button onClick={() => setPage("Profile")}>
                <Settings size={17} /> Settings
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* NOTIFICATIONS */}


      {/* MAIN */}

      <main className="main-area">
  {selectedActivityId ? (
    <ActivityDetails
      activityId={selectedActivityId}
      onBack={() => setSelectedActivityId(null)}
    />
  ) : page === "Activities" ? (
    <ActivityHistory />
  ) : page === "Profile" ? (
    <ProfileDashboard />
  ) : page === "Community" ? (
  <CommunityPage />
  ) : page === "Achievements" ? (
  <AchievementsPage />
  ) : page === "Explore" ? (
  <ExplorePage />
  ) : page ==="Leaderboard" ? (
    <LeaderboardPage/>
  ) : page === "Challenges" ? (
  <ChallengesPage />
  ) : page === "Home" ? (
          <>
            {/* INTRODUCTION */}

            <motion.section
              className="intro-section"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div>
                <div className="eyebrow">
                  <Sparkles size={14} /> YOUR PERSONAL ATHLETE SPACE
                </div>
                <h1>Find your rhythm<span>.</span></h1>
                <p>
                  
Hey {user?.name?.split(" ")[0] || "Athlete"}! Every little step brings you closer to your best.

                </p>
              </div>

              <div className="intro-date">
                
  <CalendarDays size={16} />
  {new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "2-digit",
  }).toUpperCase()}
              </div>
            </motion.section>

            {/* FEATURED ACTIVITY */}

            <motion.section
              className="hero-activity"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="hero-copy">
                <div className="hero-eyebrow">
                  <span className="live-dot" />
                  YOUR NEXT ADVENTURE
                </div>

                <h2>Make today<br />a little <em>extraordinary.</em></h2>

                <p>
                  Lace up, step outside and create a new story.
                  Your next personal best might be closer than you think.
                </p>

                <button
                  className="start-button"
                  onClick={() => setTrackingOpen(true)}
                >
                  <Play size={17} fill="currentColor" />
                  Start an activity
                  <ArrowUpRight size={17} />
                </button>

                <div className="hero-note">
                  <MapPin size={14} />
                  Your movement, your journey.
                </div>
              </div>

              <div className="hero-map">
                <RouteIllustration />
              </div>
            </motion.section>

            {/* PERFORMANCE STORY */}

            <section className="performance-section">
              
{dashboardLoading && (
  <p className="dashboard-status">Loading your activity statistics...</p>
)}

{dashboardError && (
  <p className="dashboard-error">{dashboardError}</p>
)}

              <div className="section-heading">
                <div>
                  <div className="eyebrow">THE BIGGER PICTURE</div>
                  <h2>Your week in motion</h2>
                  <p>Look how far you've come.</p>
                </div>

                <button className="text-button" onClick={() => changePage("Profile")}>
                  Full report <ChevronRight size={16} />
                </button>
              </div>

              <div className="performance-grid">
                
<div className="distance-card">
  <div className="card-kicker">TOTAL DISTANCE</div>

  <div className="big-number">
    {stats.weeklyDistance.toFixed(2)} <span>KM</span>
  </div>

  <div className="trend-label">
    {stats.distanceChange === null ? (
      <span>Building your weekly baseline</span>
    ) : (
      <>
        {stats.distanceChange >= 0
          ? <ArrowUpRight size={15} />
          : <ArrowDownRight size={15} />}
        {Math.abs(stats.distanceChange).toFixed(1)}%{" "}
        {stats.distanceChange >= 0 ? "more" : "less"} than last week
      </>
    )}
  </div>

  <div className="weekly-chart">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={stats.weeklyData}>
        <defs>
          <linearGradient id="paceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F18A65" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#F18A65" stopOpacity={0.01} />
          </linearGradient>
        </defs>

        <CartesianGrid stroke="#302B4310" vertical={false} />

        <XAxis
          dataKey="day"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#81798D", fontSize: 10 }}
        />

        <Tooltip
          contentStyle={{
            background: "#302B43",
            color: "#FFF",
            border: "none",
            borderRadius: 10,
            fontSize: 12
          }}
          formatter={(value) => [`${value} KM`, "Distance"]}
        />

        <Area
          dataKey="distance"
          type="monotone"
          stroke="#E78261"
          strokeWidth={3}
          fill="url(#paceFill)"
          activeDot={{ r: 5, fill: "#8270B6" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
</div>


                <div className="side-performance">
                  
<div className="metric-tile coral-tile">
  <div className="metric-icon">
    <Timer size={20} />
  </div>

  <div className="metric-caption">MOVING TIME</div>

  <div className="metric-value">
    {Math.floor(stats.weeklyDuration / 3600)}h{" "}
    {Math.floor((stats.weeklyDuration % 3600) / 60)}m
  </div>

  <span>Across {stats.activityCount} activities</span>
</div>


                  <div className="metric-tile lavender-tile">
                    <div className="metric-icon"><Zap size={20} /></div>
                    
<div className="metric-value">
  {stats.averagePace} <small>/km</small>
</div>
<span>Running & walking average</span>

                  </div>
                </div>
              </div>
            </section>
            {/* PERSONAL RECORDS */}

<section className="records-section">
  <div className="records-heading">
    <div>
      <div className="eyebrow">YOUR BEST PERFORMANCES</div>
      <h2>Personal records</h2>
      <p>Every milestone tells a story.</p>
    </div>

    <div className="records-trophy">
      <Trophy size={21} />
    </div>
  </div>

  <div className="records-grid">

    <div className="record-card record-featured">
      <div className="record-card-icon">
        <Trophy size={19} />
      </div>
      <span>LONGEST ACTIVITY</span>
      <strong>{allTimeLongest.toFixed(2)} <small>KM</small></strong>
      <p>Your longest recorded distance</p>
    </div>

    <div className="record-card">
      <div className="record-card-icon">
        <Zap size={19} />
      </div>
      <span>FASTEST AVERAGE PACE</span>
      <strong>{formatPace(fastestOverall)}</strong>
      <p>Minutes per km · Running & walking</p>
    </div>

    <div className="record-card">
      <div className="record-card-icon">
        <Target size={19} />
      </div>
      <span>BEST PACE · 1 KM+</span>
      <strong>{formatPace(getBestPace(1))}</strong>
      <p>Best average pace on an activity of at least 1 km</p>
    </div>

    <div className="record-card">
      <div className="record-card-icon">
        <Award size={19} />
      </div>
      <span>BEST PACE · 5 KM+</span>
      <strong>{formatPace(getBestPace(5))}</strong>
      <p>Best average pace on an activity of at least 5 km</p>
    </div>

    <div className="record-card">
      <div className="record-card-icon">
        <Footprints size={19} />
      </div>
      <span>BEST PACE · 10 KM+</span>
      <strong>{formatPace(getBestPace(10))}</strong>
      <p>Best average pace on an activity of at least 10 km</p>
    </div>

    <div className="record-card record-count">
      <div className="record-card-icon">
        <Activity size={19} />
      </div>
      <span>ALL-TIME ACTIVITIES</span>
      <strong>{savedActivities.length}</strong>
      <p>Every completed activity counts</p>
    </div>

  </div>
</section>
            {/* ACTIVITY AND GOAL */}

            <section className="lower-grid">
              <div className="activities-section">
                <div className="section-heading compact-heading">
                  <div>
                    <div className="eyebrow">KEEP THE MOMENTUM</div>
                    <h2>Recent adventures</h2>
                  </div>
                  <button className="text-button" onClick={() => changePage("Explore")}>
                    View all <ChevronRight size={15} />
                  </button>
                </div>

                <div className="activity-feed">
                  {filteredActivities.map(item => {
                    const Icon = item.icon;
                    const isLiked = liked.includes(item.id);

                    return (
                      <motion.article
                        className="activity-row"
                        key={item.id}
                        layout
                        role="button"
                        tabIndex={0}
                        style={{ cursor: "pointer" }}
                        onClick={() => setSelectedActivityId(String(item.id))}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedActivityId(String(item.id));
                          }
                        }}
                      >
                        <div className={`activity-type-icon ${item.color}`}>
                          <Icon size={21} />
                        </div>

                        <div className="activity-details">
                          <strong>{item.type}</strong>
                          <span>{item.location}</span>
                          <small>{item.date}</small>
                        </div>

                        <div className="activity-result">
                          <strong>{item.distance} <small>KM</small></strong>
                          <span>{item.pace}</span>
                        </div>

                        <button
                          className={`like-button ${isLiked ? "is-liked" : ""}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleLike(item.id);
                          }}
                          aria-label="Like activity"
                        >
                          <Heart size={17} fill={isLiked ? "currentColor" : "none"} />
                        </button>
                      </motion.article>
                    );
                  })}

                  {filteredActivities.length === 0 && (
                    <div className="empty-state">
                      <div className="empty-activities-icon">
                        <Footprints size={26} />
                      </div>
                      <strong>
                        {search ? "No matching activities" : "Your journey starts here"}
                      </strong>
                      <p>
                        {search
                          ? "Try searching with a different activity name."
                          : "Complete your first activity and it will appear here."}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <aside className="goal-section">
                <div className="goal-top">
                  <div className="goal-icon"><Target size={20} /></div>
                  <span>THIS WEEK'S GOAL</span>
                </div>

                <h3>Keep going,<br /><em>you're doing great.</em></h3>

                
<div className="goal-number">
  {stats.weeklyDistance.toFixed(2)}
  <small> / {weeklyGoal} KM</small>
</div>

<div className="goal-progress">
  <div style={{ width: `${goalProgress}%` }} />
</div>

<div className="goal-meta">
  <span>{Math.round(goalProgress)}% completed</span>
  <span>{remainingDistance.toFixed(2)} KM left</span>
</div>


                
<div className="goal-footer">
  <div className="streak-symbol">✦</div>
  <div>
    <strong>{stats.streak} day streak!</strong>
    <span>Consistency looks good on you.</span>
  </div>
</div>

              </aside>
            </section>

            {/* COMMUNITY STRIP */}

            <section className="community-strip">
              <div className="community-icon"><Users size={22} /></div>
              <div>
                <strong>Your community is waiting.</strong>
                <p>Discover athletes, share your progress and celebrate together.</p>
              </div>
              <button className="community-button" onClick={() => changePage("Community")}>
                Meet athletes <ArrowUpRight size={16} />
              </button>
            </section>
          </>
        ) : (
          <motion.section
            className="placeholder-page"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="eyebrow">YOUR PACEORBIT SPACE</div>
            <h1>{page}</h1>
            <p>
              Your {String(page).toLowerCase()} experience will be built as
              its own dedicated feature.
            </p>
            <button className="start-button" onClick={() => changePage("Home")}>
              Back to home <ArrowUpRight size={16} />
            </button>
          </motion.section>
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="mobile-bottom-nav">
        {mobileNavigation.map(item => {
          const Icon = item.icon;
          const active = page === item.name;

          return (
            <button
              key={item.name}
              className={`bottom-nav-item ${active ? "active" : ""}`}
              onClick={() => changePage(item.name)}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </button>
          );
        })}

        <button
          className="bottom-record"
          onClick={() => setTrackingOpen(true)}
          aria-label="Record activity"
        >
          <Plus size={25} />
        </button>
      </nav>

      {/* ACTIVITY MODAL */}

      {/* GPS ACTIVITY TRACKER */}

<AnimatePresence>
  {trackingOpen && (
    <ActivityTracker
      initialType="Running"
      onClose={() => setTrackingOpen(false)}
      onFinish={saveCompletedActivity}
    />
  )}
</AnimatePresence>

{newlyUnlockedAchievements.length > 0 && (
  <AchievementCelebration
    achievements={newlyUnlockedAchievements}
    onClose={() => setNewlyUnlockedAchievements([])}
  />
)}

      <footer className="page-footer">
        <span>PACEORBIT © 2026</span>
        <span>EVERY MOVE HAS A STORY.</span>
      </footer>
    </div>
  );
}


function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-icon">
          <Activity size={25} />
        </div>
        <p>Getting your PaceOrbit ready...</p>
      </div>
    );
  }

  return isAuthenticated ? <DashboardApp /> : <AuthScreen />;
}

export default App;

