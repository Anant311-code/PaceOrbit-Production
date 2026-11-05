
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Award,
  CalendarCheck,
  CheckCircle2,
  Compass,
  Crown,
  Flame,
  Footprints,
  LockKeyhole,
  Medal,
  RefreshCw,
  Sparkles,
  Sunrise,
  Trophy,
  Zap,
} from "lucide-react";
import api from "../lib/api";
import "./AchievementsPage.css";

type Category = "ALL" | "MILESTONE" | "DISTANCE" | "STREAK" | "SPECIAL";

interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  threshold: number;
  points: number;
  isUnlocked: boolean;
  unlockedAt: string | null;
}

interface AchievementSummary {
  total: number;
  unlocked: number;
  locked: number;
  totalPoints: number;
}

const iconMap: Record<string, typeof Award> = {
  footprints: Footprints,
  medal: Medal,
  compass: Compass,
  award: Award,
  trophy: Trophy,
  crown: Crown,
  flame: Flame,
  "calendar-check": CalendarCheck,
  zap: Zap,
  sunrise: Sunrise,
};

const filters: { label: string; value: Category }[] = [
  { label: "All badges", value: "ALL" },
  { label: "Milestones", value: "MILESTONE" },
  { label: "Distance", value: "DISTANCE" },
  { label: "Streaks", value: "STREAK" },
  { label: "Special", value: "SPECIAL" },
];

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [summary, setSummary] = useState<AchievementSummary>({
    total: 0,
    unlocked: 0,
    locked: 0,
    totalPoints: 0,
  });
  const [category, setCategory] = useState<Category>("ALL");
  const [status, setStatus] = useState<"ALL" | "UNLOCKED" | "LOCKED">("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadAchievements = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");

      const response = await api.get("/achievements");

      setAchievements(response.data.achievements ?? []);
      setSummary(
        response.data.summary ?? {
          total: 0,
          unlocked: 0,
          locked: 0,
          totalPoints: 0,
        }
      );
    } catch (err) {
      console.error("Achievements loading error:", err);
      setError("Unable to load achievements. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAchievements();
  }, [loadAchievements]);

  const filteredAchievements = useMemo(() => {
    return achievements.filter((item) => {
      const categoryMatch =
        category === "ALL" || item.category === category;

      const statusMatch =
        status === "ALL" ||
        (status === "UNLOCKED" && item.isUnlocked) ||
        (status === "LOCKED" && !item.isUnlocked);

      return categoryMatch && statusMatch;
    });
  }, [achievements, category, status]);

  const progress =
    summary.total > 0
      ? Math.round((summary.unlocked / summary.total) * 100)
      : 0;

  const getCategoryLabel = (value: string) => {
    const labels: Record<string, string> = {
      MILESTONE: "Milestone",
      DISTANCE: "Distance",
      STREAK: "Consistency",
      SPECIAL: "Special",
      GENERAL: "General",
    };

    return labels[value] ?? value;
  };

  const formatDate = (value: string | null) => {
    if (!value) return "";
    return new Date(value).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getIcon = (name: string) => {
    return iconMap[name] ?? Award;
  };

  return (
    <div className="achievements-page">
      <section className="achievements-hero">
        <div className="achievements-hero-copy">
          <div className="achievements-eyebrow">
            <Sparkles size={14} />
            YOUR PERSONAL MILESTONES
          </div>

          <h1>
            Every effort
            <br />
            earns its <em>moment.</em>
          </h1>

          <p>
            Celebrate your progress, collect badges and discover
            what you are capable of.
          </p>
        </div>

        <div className="achievements-hero-art">
          <div className="achievement-orbit orbit-one" />
          <div className="achievement-orbit orbit-two" />
          <div className="achievement-hero-medal">
            <Trophy size={58} strokeWidth={1.4} />
            <Sparkles className="achievement-hero-sparkle" size={21} />
          </div>
          <span className="achievement-art-label">EARN YOUR LEGACY</span>
        </div>
      </section>

      <section className="achievement-overview">
        <div className="achievement-overview-card points-card">
          <div className="achievement-overview-icon">
            <Trophy size={20} />
          </div>
          <span className="achievement-overview-label">TOTAL POINTS</span>
          <strong>{summary.totalPoints.toLocaleString("en-IN")}</strong>
          <small>Points earned so far</small>
        </div>

        <div className="achievement-overview-card">
          <div className="achievement-overview-icon lavender">
            <Award size={20} />
          </div>
          <span className="achievement-overview-label">UNLOCKED</span>
          <strong>{summary.unlocked}</strong>
          <small>Badges collected</small>
        </div>

        <div className="achievement-overview-card">
          <div className="achievement-overview-icon sage">
            <LockKeyhole size={20} />
          </div>
          <span className="achievement-overview-label">STILL TO EARN</span>
          <strong>{summary.locked}</strong>
          <small>More milestones ahead</small>
        </div>

        <div className="achievement-overview-card completion-card">
          <div className="achievement-overview-icon coral">
            <Activity size={20} />
          </div>
          <span className="achievement-overview-label">COLLECTION</span>
          <strong>{progress}%</strong>
          <div className="achievement-mini-progress">
            <div style={{ width: `${progress}%` }} />
          </div>
          <small>{summary.unlocked} of {summary.total} collected</small>
        </div>
      </section>

      <section className="achievement-collection">
        <div className="achievement-section-heading">
          <div>
            <div className="achievements-eyebrow">THE COLLECTION</div>
            <h2>Your achievements</h2>
            <p>Every badge tells a story of showing up.</p>
          </div>

          <button
            className="achievement-refresh"
            onClick={() => loadAchievements(true)}
            disabled={refreshing}
          >
            <RefreshCw
              size={15}
              className={refreshing ? "achievement-spinning" : ""}
            />
            Refresh
          </button>
        </div>

        <div className="achievement-controls">
          <div className="achievement-category-filters">
            {filters.map((filter) => (
              <button
                key={filter.value}
                className={category === filter.value ? "active" : ""}
                onClick={() => setCategory(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="achievement-status-filter">
            <button
              className={status === "ALL" ? "active" : ""}
              onClick={() => setStatus("ALL")}
            >
              All
            </button>
            <button
              className={status === "UNLOCKED" ? "active" : ""}
              onClick={() => setStatus("UNLOCKED")}
            >
              Unlocked
            </button>
            <button
              className={status === "LOCKED" ? "active" : ""}
              onClick={() => setStatus("LOCKED")}
            >
              Locked
            </button>
          </div>
        </div>

        {loading ? (
          <div className="achievement-loading">
            <RefreshCw size={24} className="achievement-spinning" />
            <span>Loading your achievements...</span>
          </div>
        ) : error ? (
          <div className="achievement-empty">
            <Award size={30} />
            <strong>Something went wrong</strong>
            <p>{error}</p>
            <button onClick={() => loadAchievements()}>
              Try again
            </button>
          </div>
        ) : filteredAchievements.length === 0 ? (
          <div className="achievement-empty">
            <Medal size={32} />
            <strong>No badges found</strong>
            <p>Try changing your category or status filter.</p>
          </div>
        ) : (
          <div className="achievement-grid">
            {filteredAchievements.map((item) => {
              const Icon = getIcon(item.icon);

              return (
                <article
                  key={item.id}
                  className={`achievement-card ${
                    item.isUnlocked ? "is-unlocked" : "is-locked"
                  }`}
                >
                  <div className="achievement-card-top">
                    <span className="achievement-category">
                      {getCategoryLabel(item.category)}
                    </span>

                    {item.isUnlocked ? (
                      <CheckCircle2
                        className="achievement-check"
                        size={19}
                      />
                    ) : (
                      <LockKeyhole
                        className="achievement-lock"
                        size={17}
                      />
                    )}
                  </div>

                  <div className="achievement-badge-wrap">
                    <div className="achievement-badge">
                      <Icon size={34} strokeWidth={1.65} />
                    </div>
                    {item.isUnlocked && (
                      <Sparkles
                        className="achievement-badge-sparkle"
                        size={17}
                      />
                    )}
                  </div>

                  <h3>{item.name}</h3>
                  <p>{item.description}</p>

                  <div className="achievement-card-bottom">
                    <span className="achievement-points">
                      <Sparkles size={13} />
                      {item.points} points
                    </span>

                    {item.isUnlocked ? (
                      <span className="achievement-earned">
                        Earned {formatDate(item.unlockedAt)}
                      </span>
                    ) : (
                      <span className="achievement-not-earned">
                        Not unlocked yet
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="achievement-footer-card">
        <div className="achievement-footer-icon">
          <Footprints size={23} />
        </div>
        <div>
          <strong>Your next milestone is waiting.</strong>
          <p>Keep moving. Your progress is worth celebrating.</p>
        </div>
        <Sparkles className="achievement-footer-sparkle" size={23} />
      </section>
    </div>
  );
}
