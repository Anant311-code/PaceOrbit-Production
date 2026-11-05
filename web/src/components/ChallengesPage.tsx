import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bike,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Crown,
  Footprints,
  LoaderCircle,
  MapPin,
  Medal,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
  Users,
  X,
} from "lucide-react";
import api from "../lib/api";
import "./ChallengesPage.css";

type ActivityType = "All" | "Running" | "Cycling" | "Walking";
type ChallengeTab = "Discover" | "My Challenges";

interface Challenge {
  id: string;
  title: string;
  description: string;
  activityType: string;
  goalDistance: number;
  startDate: string;
  endDate: string;
  participantsCount: number;
  isJoined?: boolean;
  progress: number;
  activitiesCount: number;
  status?: "active" | "upcoming" | "completed";
  joinedAt?: string;
  percentage?: number;
  isCompleted?: boolean;
}

interface ChallengeAthlete {
  rank: number;
  user: {
    id: string;
    name: string;
    photoUrl?: string | null;
    location?: string | null;
  };
  totalDistance: number;
  activitiesCount: number;
  percentage: number;
  isCompleted: boolean;
}

interface ChallengeLeaderboardResponse {
  success: boolean;
  challenge: {
    id: string;
    title: string;
    goalDistance: number;
    activityType: string;
    startDate: string;
    endDate: string;
  };
  leaderboard: ChallengeAthlete[];
}

const filters: ActivityType[] = [
  "All",
  "Running",
  "Cycling",
  "Walking",
];

function initials(name?: string) {
  return (name || "Athlete")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDaysLeft(date: string) {
  const difference = new Date(date).getTime() - Date.now();
  return Math.max(0, Math.ceil(difference / (1000 * 60 * 60 * 24)));
}

function getActivityIcon(type: string) {
  switch (type) {
    case "Running":
      return Footprints;
    case "Cycling":
      return Bike;
    case "Walking":
      return Footprints;
    default:
      return Activity;
  }
}

function getProgress(challenge: Challenge) {
  if (challenge.percentage !== undefined) {
    return Math.min(100, Math.max(0, challenge.percentage));
  }

  if (!challenge.goalDistance) return 0;

  return Math.min(
    100,
    Math.max(0, (challenge.progress / challenge.goalDistance) * 100)
  );
}

function getStatus(challenge: Challenge) {
  if (challenge.status) return challenge.status;

  const now = Date.now();

  if (now < new Date(challenge.startDate).getTime()) return "upcoming";
  if (now > new Date(challenge.endDate).getTime()) return "completed";

  return "active";
}

function ChallengesPage() {
  const [tab, setTab] = useState<ChallengeTab>("Discover");
  const [filter, setFilter] = useState<ActivityType>("All");
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [myChallenges, setMyChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [selectedChallenge, setSelectedChallenge] =
    useState<Challenge | null>(null);
  const [leaderboard, setLeaderboard] =
    useState<ChallengeLeaderboardResponse | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState("");

  const loadChallenges = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [allResponse, myResponse] = await Promise.all([
        api.get("/challenges"),
        api.get("/challenges/my"),
      ]);

      setChallenges(allResponse.data.challenges || []);
      setMyChallenges(myResponse.data.challenges || []);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to load challenges. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadChallenges();
  }, [loadChallenges]);

  const visibleChallenges = useMemo(() => {
    const source = tab === "Discover" ? challenges : myChallenges;

    return source.filter((challenge) => {
      const matchesFilter =
        filter === "All" || challenge.activityType === filter;

      return matchesFilter;
    });
  }, [challenges, myChallenges, tab, filter]);

  const joinedIds = useMemo(
    () => new Set(myChallenges.map((challenge) => challenge.id)),
    [myChallenges]
  );

  const handleJoinLeave = async (challenge: Challenge) => {
    const isJoined = joinedIds.has(challenge.id);

    try {
      setActionId(challenge.id);

      if (isJoined) {
        await api.delete(`/challenges/${challenge.id}/leave`);
      } else {
        await api.post(`/challenges/${challenge.id}/join`);
      }

      await loadChallenges();
    } catch (err: any) {
      window.alert(
        err?.response?.data?.message ||
          `Unable to ${isJoined ? "leave" : "join"} this challenge.`
      );
    } finally {
      setActionId(null);
    }
  };

  const openLeaderboard = async (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setLeaderboard(null);
    setLeaderboardError("");

    try {
      setLeaderboardLoading(true);

      const response = await api.get(
        `/challenges/${challenge.id}/leaderboard`
      );

      setLeaderboard(response.data);
    } catch (err: any) {
      setLeaderboardError(
        err?.response?.data?.message ||
          "Unable to load challenge rankings."
      );
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const activeCount = myChallenges.filter(
    (item) => getStatus(item) === "active"
  ).length;

  const completedCount = myChallenges.filter(
    (item) => item.isCompleted
  ).length;

  const totalProgress = myChallenges.reduce(
    (sum, item) => sum + item.progress,
    0
  );

  return (
    <div className="challenges-page">
      {/* HERO */}
      <section className="challenges-hero">
        <div className="challenges-hero-copy">
          <div className="challenges-eyebrow">
            <span />
            THE PACEORBIT CHALLENGE CLUB
          </div>

          <h1>
            Find your
            <br />
            <em>next finish line.</em>
          </h1>

          <p>
            Set a goal. Find your people. Make every kilometre count.
            Your next achievement starts with one challenge.
          </p>

          <button
            className="challenge-explore-button"
            onClick={() => {
              setTab("Discover");
              document
                .getElementById("challenge-discover")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Explore challenges
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="challenges-hero-art" aria-hidden="true">
          <div className="challenge-art-orbit orbit-a" />
          <div className="challenge-art-orbit orbit-b" />
          <div className="challenge-art-circle">
            <Trophy size={88} strokeWidth={1.2} />
          </div>
          <div className="challenge-art-star star-a">✦</div>
          <div className="challenge-art-star star-b">✧</div>
          <div className="challenge-art-caption">GO BEYOND YOUR LIMITS</div>
        </div>
      </section>

      {/* PERSONAL STATS */}
      <section className="challenge-stats">
        <div className="challenge-stat-card">
          <div className="challenge-stat-icon lavender">
            <Target size={19} />
          </div>
          <div>
            <span>JOINED CHALLENGES</span>
            <strong>{myChallenges.length}</strong>
          </div>
        </div>

        <div className="challenge-stat-card">
          <div className="challenge-stat-icon coral">
            <Activity size={19} />
          </div>
          <div>
            <span>ACTIVE CHALLENGES</span>
            <strong>{activeCount}</strong>
          </div>
        </div>

        <div className="challenge-stat-card">
          <div className="challenge-stat-icon sage">
            <Medal size={19} />
          </div>
          <div>
            <span>COMPLETED</span>
            <strong>{completedCount}</strong>
          </div>
        </div>

        <div className="challenge-stat-card">
          <div className="challenge-stat-icon peach">
            <Footprints size={19} />
          </div>
          <div>
            <span>CHALLENGE DISTANCE</span>
            <strong>
              {totalProgress.toFixed(1)}
              <small> km</small>
            </strong>
          </div>
        </div>
      </section>

      {/* MAIN CHALLENGES */}
      <section
        className="challenge-content-section"
        id="challenge-discover"
      >
        <div className="challenge-section-heading">
          <div>
            <span className="challenge-section-kicker">
              YOUR NEXT ADVENTURE
            </span>
            <h2>Challenges worth chasing.</h2>
            <p>Small goals. Big milestones. Your pace, your rules.</p>
          </div>

          <button
            className="challenge-refresh"
            onClick={() => void loadChallenges()}
            disabled={loading}
            aria-label="Refresh challenges"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        <div className="challenge-toolbar">
          <div className="challenge-tabs">
            {(["Discover", "My Challenges"] as ChallengeTab[]).map(
              (item) => (
                <button
                  key={item}
                  className={tab === item ? "active" : ""}
                  onClick={() => setTab(item)}
                >
                  {item}
                  {item === "My Challenges" && (
                    <span>{myChallenges.length}</span>
                  )}
                </button>
              )
            )}
          </div>

          <div className="challenge-filters">
            {filters.map((item) => (
              <button
                key={item}
                className={filter === item ? "active" : ""}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="challenge-state">
            <LoaderCircle className="challenge-loading-icon" size={30} />
            <strong>Preparing your next challenge...</strong>
            <span>Finding goals worth chasing.</span>
          </div>
        ) : error ? (
          <div className="challenge-state challenge-error">
            <Target size={34} />
            <strong>We couldn't load your challenges.</strong>
            <span>{error}</span>
            <button onClick={() => void loadChallenges()}>
              Try again
            </button>
          </div>
        ) : visibleChallenges.length === 0 ? (
          <div className="challenge-state">
            <div className="challenge-empty-icon">
              <Trophy size={30} />
            </div>
            <strong>
              {tab === "My Challenges"
                ? "Your challenge journey starts here."
                : "No challenges found."}
            </strong>
            <span>
              {tab === "My Challenges"
                ? "Explore the available challenges and join your first one."
                : "Try another activity filter or check back later."}
            </span>
            {tab === "My Challenges" && (
              <button onClick={() => setTab("Discover")}>
                Discover challenges
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        ) : (
          <div className="challenge-grid">
            {visibleChallenges.map((challenge, index) => {
              const Icon = getActivityIcon(challenge.activityType);
              const percentage = getProgress(challenge);
              const isJoined = joinedIds.has(challenge.id);
              const status = getStatus(challenge);
              const isCompleted =
                challenge.isCompleted || percentage >= 100;

              return (
                <article
                  className={`challenge-card challenge-card-${index % 4}`}
                  key={challenge.id}
                >
                  <div className="challenge-card-top">
                    <div className={`challenge-type-icon type-${challenge.activityType.toLowerCase()}`}>
                      <Icon size={20} />
                    </div>

                    <span className={`challenge-status status-${status}`}>
                      {status === "active"
                        ? "● ACTIVE"
                        : status === "upcoming"
                          ? "◷ UPCOMING"
                          : "✓ ENDED"}
                    </span>
                  </div>

                  <div className="challenge-card-body">
                    <span className="challenge-card-category">
                      {challenge.activityType === "All"
                        ? "MULTI-ACTIVITY"
                        : challenge.activityType.toUpperCase()}
                    </span>

                    <h3>{challenge.title}</h3>
                    <p>{challenge.description}</p>
                  </div>

                  <div className="challenge-goal">
                    <div>
                      <strong>{challenge.goalDistance}</strong>
                      <span>KM GOAL</span>
                    </div>

                    <div className="challenge-participants">
                      <Users size={14} />
                      {challenge.participantsCount} joined
                    </div>
                  </div>

                  <div className="challenge-progress-area">
                    <div className="challenge-progress-label">
                      <span>Your progress</span>
                      <strong>{percentage.toFixed(1)}%</strong>
                    </div>

                    <div className="challenge-progress-track">
                      <div
                        className="challenge-progress-fill"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <div className="challenge-progress-meta">
                      <span>
                        {challenge.progress.toFixed(2)} /{" "}
                        {challenge.goalDistance} km
                      </span>
                      <span>
                        {challenge.activitiesCount} activities
                      </span>
                    </div>
                  </div>

                  <div className="challenge-date-row">
                    <CalendarDays size={14} />
                    <span>
                      {formatDate(challenge.startDate)} –{" "}
                      {formatDate(challenge.endDate)}
                    </span>
                  </div>

                  {status === "active" && (
                    <div className="challenge-time-left">
                      <Clock3 size={13} />
                      {getDaysLeft(challenge.endDate)} days remaining
                    </div>
                  )}

                  {status === "upcoming" && (
                    <div className="challenge-time-left upcoming-time">
                      <Clock3 size={13} />
                      Starts in {getDaysLeft(challenge.startDate)} days
                    </div>
                  )}

                  {status === "completed" && (
                    <div className="challenge-time-left completed-time">
                      <Check size={13} />
                      Challenge period ended
                    </div>
                  )}

                  <div className="challenge-card-actions">
                    <button
                      className={`challenge-join-button ${
                        isJoined ? "joined" : ""
                      }`}
                      disabled={
  actionId === challenge.id ||
  status === "completed"
}
                      onClick={() => void handleJoinLeave(challenge)}
                    >
                      {actionId === challenge.id ? (
                        <LoaderCircle size={16} className="challenge-loading-icon" />
                      ) : isJoined ? (
                        <>
                          <Check size={16} />
                          Leave challenge
                        </>
                      ) : (
                        <>
                          Join challenge
                          <ArrowRight size={15} />
                        </>
                      )}
                    </button>

                    <button
                      className="challenge-leaderboard-button"
                      onClick={() => void openLeaderboard(challenge)}
                      aria-label={`View ${challenge.title} leaderboard`}
                      title="View leaderboard"
                    >
                      <Trophy size={17} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* MOTIVATION STRIP */}
      <section className="challenge-motivation">
        <div className="challenge-motivation-icon">
          <Sparkles size={23} />
        </div>

        <div>
          <strong>Progress over perfection.</strong>
          <p>
            You don't have to be the fastest. You just have to keep moving.
          </p>
        </div>

        <div className="challenge-motivation-decoration">✦</div>
      </section>

      {/* LEADERBOARD MODAL */}
      {selectedChallenge && (
        <div
          className="challenge-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedChallenge(null);
              setLeaderboard(null);
            }
          }}
        >
          <section
            className="challenge-leaderboard-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Challenge leaderboard"
          >
            <div className="challenge-modal-header">
              <div>
                <span>THE CHALLENGE ARENA</span>
                <h2>{selectedChallenge.title}</h2>
                <p>
                  {selectedChallenge.goalDistance} KM target ·{" "}
                  {selectedChallenge.activityType}
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedChallenge(null);
                  setLeaderboard(null);
                }}
                aria-label="Close leaderboard"
              >
                <X size={20} />
              </button>
            </div>

            {leaderboardLoading ? (
              <div className="challenge-modal-state">
                <LoaderCircle
                  size={28}
                  className="challenge-loading-icon"
                />
                Loading rankings...
              </div>
            ) : leaderboardError ? (
              <div className="challenge-modal-state">
                <p>{leaderboardError}</p>
              </div>
            ) : (
              <>
                <div className="challenge-modal-summary">
                  <div>
                    <Users size={16} />
                    {leaderboard?.leaderboard.length ?? 0} participants
                  </div>
                  <div>
                    <MapPin size={16} />
                    {formatDate(selectedChallenge.startDate)} –{" "}
                    {formatDate(selectedChallenge.endDate)}
                  </div>
                </div>

                <div className="challenge-ranking-list">
                  {leaderboard?.leaderboard.length ? (
                    leaderboard.leaderboard.map((athlete) => (
                      <div
                        className={`challenge-ranking-row ${
                          athlete.rank === 1 ? "first-place" : ""
                        }`}
                        key={athlete.user.id}
                      >
                        <div className="challenge-ranking-position">
                          {athlete.rank === 1 ? (
                            <Crown size={19} />
                          ) : athlete.rank === 2 ? (
                            <Medal size={18} />
                          ) : athlete.rank === 3 ? (
                            <Medal size={18} />
                          ) : (
                            String(athlete.rank).padStart(2, "0")
                          )}
                        </div>

                        <div className="challenge-ranking-avatar">
                          {athlete.user.photoUrl ? (
                            <img
                              src={athlete.user.photoUrl}
                              alt={athlete.user.name}
                            />
                          ) : (
                            <span>{initials(athlete.user.name)}</span>
                          )}
                        </div>

                        <div className="challenge-ranking-user">
                          <strong>{athlete.user.name}</strong>
                          <span>
                            {athlete.activitiesCount} activities
                          </span>
                        </div>

                        <div className="challenge-ranking-distance">
                          <strong>
                            {athlete.totalDistance.toFixed(2)}
                          </strong>
                          <span>KM</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="challenge-modal-state">
                      <Trophy size={30} />
                      <strong>No participants yet.</strong>
                      <p>Be the first to join this challenge!</p>
                    </div>
                  )}
                </div>
              </>
            )}

            <button
              className="challenge-modal-close"
              onClick={() => {
                setSelectedChallenge(null);
                setLeaderboard(null);
              }}
            >
              Close leaderboard
              <ChevronRight size={16} />
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

export default ChallengesPage;