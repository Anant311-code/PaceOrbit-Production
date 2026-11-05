import { useEffect, useState } from "react";
import {
  Activity,
  Bike,
  CalendarDays,
  ChevronDown,
  Crown,
  Footprints,
  MapPin,
  Medal,
  RefreshCw,
  Trophy,
  Users,
} from "lucide-react";
import api from "../lib/api";
import "./LeaderboardPage.css";

type Period = "week" | "month" | "all";
type ActivityType = "All" | "Running" | "Cycling" | "Walking";

interface LeaderboardUser {
  rank: number;
  userId: string;
  user: {
    id: string;
    name: string;
    photoUrl?: string | null;
    location?: string | null;
  } | null;
  totalDistance: number;
  activitiesCount: number;
  isCurrentUser: boolean;
}

interface LeaderboardResponse {
  success: boolean;
  period: string;
  activityType: string;
  leaderboard: LeaderboardUser[];
  currentUserRank: LeaderboardUser | null;
  totalAthletes: number;
}

const activityOptions: ActivityType[] = [
  "All",
  "Running",
  "Cycling",
  "Walking",
];

function getInitials(name?: string) {
  return (name || "Athlete")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getActivityIcon(type: ActivityType) {
  if (type === "Running") return <Activity size={16} />;
  if (type === "Cycling") return <Bike size={16} />;
  if (type === "Walking") return <Footprints size={16} />;
  return <Trophy size={16} />;
}

function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>("week");
  const [activityType, setActivityType] = useState<ActivityType>("All");
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({ period });

      if (activityType !== "All") {
        params.set("type", activityType);
      }

      const response = await api.get(
        `/community/leaderboard?${params.toString()}`
      );

      setData(response.data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to load leaderboard. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
  }, [period, activityType]);

  const leaderboard = data?.leaderboard || [];
  const podium = leaderboard.slice(0, 3);
  const remainingAthletes = leaderboard.slice(3);
  const currentUser = data?.currentUserRank;

  const periodLabel =
    period === "week"
      ? "This week"
      : period === "month"
        ? "This month"
        : "All time";

  return (
    <div className="leaderboard-page">
      <section className="leaderboard-hero">
        <div className="leaderboard-hero-content">
          <div className="leaderboard-eyebrow">
            <span className="leaderboard-eyebrow-dot" />
            THE PACEORBIT ARENA
          </div>

          <h1>
            Every mile
            <br />
            <span>makes a mark.</span>
          </h1>

          <p>
            Your effort deserves a place on the board. Track your progress,
            challenge the community, and climb the rankings.
          </p>

          <div className="leaderboard-hero-meta">
            <span>
              <Users size={16} />
              {data?.totalAthletes ?? "—"} athletes
            </span>
            <span>
              <CalendarDays size={16} />
              {periodLabel}
            </span>
          </div>
        </div>

        <div className="leaderboard-hero-art" aria-hidden="true">
          <div className="leaderboard-orbit orbit-one" />
          <div className="leaderboard-orbit orbit-two" />
          <div className="leaderboard-trophy">
            <Trophy size={100} strokeWidth={1.1} />
          </div>
          <div className="leaderboard-art-star star-one">✦</div>
          <div className="leaderboard-art-star star-two">✧</div>
          <div className="leaderboard-art-label">YOUR NEXT MILESTONE</div>
        </div>
      </section>

      <section className="leaderboard-controls">
        <div className="leaderboard-period-tabs">
          {(["week", "month", "all"] as Period[]).map((item) => (
            <button
              key={item}
              className={period === item ? "active" : ""}
              onClick={() => setPeriod(item)}
            >
              {item === "week"
                ? "This week"
                : item === "month"
                  ? "This month"
                  : "All time"}
            </button>
          ))}
        </div>

        <div className="leaderboard-filter">
          <span>Activity</span>
          <div className="leaderboard-select-wrap">
            <select
              value={activityType}
              onChange={(event) =>
                setActivityType(event.target.value as ActivityType)
              }
            >
              {activityOptions.map((option) => (
                <option value={option} key={option}>
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown size={16} />
          </div>
        </div>
      </section>

      {currentUser && (
        <section className="your-rank-card">
          <div className="your-rank-icon">
            <Medal size={22} />
          </div>
          <div className="your-rank-copy">
            <strong>Your position</strong>
            <span>
              {currentUser.rank
                ? `You're ranked #${currentUser.rank} ${periodLabel.toLowerCase()}`
                : "Complete an activity to enter the leaderboard"}
            </span>
          </div>
          <div className="your-rank-number">
            {currentUser.rank ? `#${currentUser.rank}` : "—"}
          </div>
        </section>
      )}

      <section className="leaderboard-main">
        <div className="leaderboard-section-heading">
          <div>
            <span className="leaderboard-section-kicker">THE COMMUNITY</span>
            <h2>Top performers</h2>
          </div>
          <div className="leaderboard-live-label">
            <span />
            LIVE RANKINGS
          </div>
        </div>

        {loading ? (
          <div className="leaderboard-state">
            <RefreshCw className="leaderboard-spinner" size={26} />
            <p>Finding the front-runners...</p>
          </div>
        ) : error ? (
          <div className="leaderboard-state leaderboard-error">
            <p>{error}</p>
            <button onClick={loadLeaderboard}>Try again</button>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="leaderboard-state">
            <Trophy size={34} />
            <h3>The board is waiting for its first champion.</h3>
            <p>Complete an activity and your name can appear here.</p>
          </div>
        ) : (
          <>
            {podium.length > 0 && (
              <div className="leaderboard-podium">
                {[podium[1], podium[0], podium[2]]
                  .filter(Boolean)
                  .map((athlete) => (
                    <div
                      key={athlete.userId}
                      className={`podium-card podium-rank-${athlete.rank} ${
                        athlete.isCurrentUser ? "is-you" : ""
                      }`}
                    >
                      <div className="podium-medal">
                        {athlete.rank === 1 ? (
                          <Crown size={22} />
                        ) : (
                          <Medal size={21} />
                        )}
                      </div>

                      <div className="podium-avatar">
                        {athlete.user?.photoUrl ? (
                          <img
                            src={athlete.user.photoUrl}
                            alt={athlete.user.name}
                          />
                        ) : (
                          <span>{getInitials(athlete.user?.name)}</span>
                        )}
                      </div>

                      <strong className="podium-name">
                        {athlete.user?.name || "PaceOrbit Athlete"}
                      </strong>

                      <span className="podium-location">
                        {athlete.isCurrentUser
                          ? "YOU"
                          : athlete.user?.location || "Community athlete"}
                      </span>

                      <div className="podium-distance">
                        {athlete.totalDistance.toFixed(2)}
                        <small>KM</small>
                      </div>

                      <span className="podium-activities">
                        {athlete.activitiesCount} activities
                      </span>

                      <div className="podium-platform">
                        <span>{athlete.rank}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            <div className="leaderboard-table-wrap">
              <div className="leaderboard-table-heading">
                <span>ATHLETE RANKINGS</span>
                <span>{leaderboard.length} ATHLETES</span>
              </div>

              {remainingAthletes.map((athlete) => (
                <div
                  className={`leaderboard-row ${
                    athlete.isCurrentUser ? "is-you" : ""
                  }`}
                  key={athlete.userId}
                >
                  <div className="leaderboard-row-rank">
                    {String(athlete.rank).padStart(2, "0")}
                  </div>

                  <div className="leaderboard-row-avatar">
                    {athlete.user?.photoUrl ? (
                      <img
                        src={athlete.user.photoUrl}
                        alt={athlete.user.name}
                      />
                    ) : (
                      <span>{getInitials(athlete.user?.name)}</span>
                    )}
                  </div>

                  <div className="leaderboard-row-user">
                    <strong>
                      {athlete.user?.name || "PaceOrbit Athlete"}
                      {athlete.isCurrentUser && (
                        <span className="you-label">YOU</span>
                      )}
                    </strong>
                    <span>
                      <MapPin size={12} />
                      {athlete.user?.location || "Location not added"}
                    </span>
                  </div>

                  <div className="leaderboard-row-activities">
                    <span>{athlete.activitiesCount}</span>
                    <small>Activities</small>
                  </div>

                  <div className="leaderboard-row-distance">
                    <strong>{athlete.totalDistance.toFixed(2)}</strong>
                    <span>KM</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="leaderboard-footer-note">
        <div>{getActivityIcon(activityType)}</div>
        <p>
          Rankings are based on total recorded distance for{" "}
          <strong>{activityType.toLowerCase()}</strong> activities during{" "}
          <strong>{periodLabel.toLowerCase()}</strong>.
        </p>
      </section>
    </div>
  );
}

export default LeaderboardPage;