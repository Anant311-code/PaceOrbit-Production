
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bike,
  Heart,
  LoaderCircle,
  MapPin,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  UserPlus,
  Users,
  Footprints,
  X,
} from "lucide-react";
import api from "../lib/api";
import "./CommunityPage.css";

type Athlete = {
  id: string;
  name: string;
  location?: string | null;
  bio?: string | null;
  photoUrl?: string | null;
  followersCount: number;
  followingCount: number;
  activitiesCount: number;
  isFollowing: boolean;
};

type ActivityItem = {
  id: string;
  userId: string;
  type: string;
  distance: number;
  duration: number;
  pace?: string | null;
  speed?: number | null;
  date: string;
  routePoints?: unknown;
  user: {
    id: string;
    name: string;
    location?: string | null;
    photoUrl?: string | null;
  };
  kudosCount: number;
  commentsCount: number;
  hasKudos: boolean;
};

type CommentItem = {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    photoUrl?: string | null;
  };
};

type Tab = "feed" | "athletes";

function getErrorMessage(error: unknown, fallback: string) {
  const err = error as {
    response?: { data?: { message?: string } };
    message?: string;
  };

  return err.response?.data?.message || err.message || fallback;
}

function formatDistance(distance: number) {
  return `${Number(distance || 0).toFixed(2)} km`;
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Number(seconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
}

function formatDate(date: string) {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "Recently";

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getActivityIcon(type: string) {
  const normalized = type.toLowerCase();

  if (normalized.includes("cycl")) return Bike;
  if (normalized.includes("walk")) return Footprints;

  return Activity;
}

function Avatar({
  name,
  photoUrl,
  size = "normal",
}: {
  name: string;
  photoUrl?: string | null;
  size?: "normal" | "large";
}) {
  return (
    <div className={`po-community-avatar ${size}`}>
      {photoUrl ? (
        <img src={photoUrl} alt={name} />
      ) : (
        <span>{name?.charAt(0)?.toUpperCase() || "A"}</span>
      )}
    </div>
  );
}

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [search, setSearch] = useState("");
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [loadingAthletes, setLoadingAthletes] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const [commentActivityId, setCommentActivityId] = useState<string | null>(
    null
  );
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const loadFeed = useCallback(async () => {
    setLoadingFeed(true);
    setError("");

    try {
      const response = await api.get("/community/feed?page=1&limit=30");
      setActivities(response.data.activities || []);
      setPage(1);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load community feed."));
    } finally {
      setLoadingFeed(false);
    }
  }, []);

  const loadAthletes = useCallback(async (query = "") => {
    setLoadingAthletes(true);
    setError("");

    try {
      const response = await api.get("/community/athletes", {
        params: {
          q: query,
          page: 1,
          limit: 30,
        },
      });

      setAthletes(response.data.athletes || []);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to discover athletes."));
    } finally {
      setLoadingAthletes(false);
    }
  }, []);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    if (activeTab === "athletes") {
      void loadAthletes(search.trim());
    }
  }, [activeTab, loadAthletes]);

  const handleSearch = (value: string) => {
    setSearch(value);
    void loadAthletes(value.trim());
  };

  const handleFollow = async (athlete: Athlete) => {
    const previous = athletes;

    setAthletes((current) =>
      current.map((item) =>
        item.id === athlete.id
          ? {
              ...item,
              isFollowing: !item.isFollowing,
              followersCount: Math.max(
                0,
                item.followersCount + (item.isFollowing ? -1 : 1)
              ),
            }
          : item
      )
    );

    try {
      if (athlete.isFollowing) {
        await api.delete(`/community/follow/${athlete.id}`);
      } else {
        await api.post(`/community/follow/${athlete.id}`);
      }
    } catch (err) {
      setAthletes(previous);
      setError(getErrorMessage(err, "Unable to update follow status."));
    }
  };

  const handleKudos = async (activity: ActivityItem) => {
    const previous = activities;

    setActivities((current) =>
      current.map((item) =>
        item.id === activity.id
          ? {
              ...item,
              hasKudos: !item.hasKudos,
              kudosCount: Math.max(
                0,
                item.kudosCount + (item.hasKudos ? -1 : 1)
              ),
            }
          : item
      )
    );

    try {
      if (activity.hasKudos) {
        await api.delete(`/community/activities/${activity.id}/kudos`);
      } else {
        await api.post(`/community/activities/${activity.id}/kudos`);
      }
    } catch (err) {
      setActivities(previous);
      setError(getErrorMessage(err, "Unable to update kudos."));
    }
  };

  const openComments = async (activityId: string) => {
    setCommentActivityId(activityId);
    setComments([]);
    setCommentText("");
    setCommentsLoading(true);

    try {
      const response = await api.get(
        `/community/activities/${activityId}/comments`
      );

      setComments(response.data.comments || []);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load comments."));
    } finally {
      setCommentsLoading(false);
    }
  };

  const submitComment = async () => {
    if (!commentActivityId || !commentText.trim()) return;

    setCommentSubmitting(true);

    try {
      const response = await api.post(
        `/community/activities/${commentActivityId}/comments`,
        { content: commentText.trim() }
      );

      setComments((current) => [
        response.data.comment,
        ...current,
      ]);

      setActivities((current) =>
        current.map((item) =>
          item.id === commentActivityId
            ? { ...item, commentsCount: item.commentsCount + 1 }
            : item
        )
      );

      setCommentText("");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to post comment."));
    } finally {
      setCommentSubmitting(false);
    }
  };

  const selectedActivity = activities.find(
    (item) => item.id === commentActivityId
  );

  return (
    <main className="po-community">
      <section className="po-community-hero">
        <div className="po-community-hero-copy">
          <div className="po-community-eyebrow">
            <Users size={14} />
            THE PACEORBIT COMMUNITY
          </div>

          <h1>
            Better together.
            <br />
            <em>Stronger every day.</em>
          </h1>

          <p>
            Find your people, celebrate every milestone and stay inspired
            by the movement happening around you.
          </p>

          <div className="po-community-hero-stats">
            <div>
              <strong>{activities.length}</strong>
              <span>Visible activities</span>
            </div>
            <div>
              <strong>{athletes.length}</strong>
              <span>Discoverable athletes</span>
            </div>
          </div>
        </div>

        <div className="po-community-hero-art">
          <div className="po-community-orbit orbit-one" />
          <div className="po-community-orbit orbit-two" />
          <div className="po-community-hero-icon">
            <Users size={54} strokeWidth={1.4} />
          </div>
          <div className="po-community-floating floating-one">
            <Heart size={18} fill="currentColor" />
          </div>
          <div className="po-community-floating floating-two">
            <Activity size={19} />
          </div>
          <div className="po-community-floating floating-three">
            <Footprints size={19} />
          </div>
        </div>
      </section>

      <section className="po-community-layout">
        <div className="po-community-main">
          <div className="po-community-tabs">
            <button
              className={activeTab === "feed" ? "active" : ""}
              onClick={() => {
                setActiveTab("feed");
                setError("");
              }}
            >
              <Activity size={17} />
              Community feed
            </button>

            <button
              className={activeTab === "athletes" ? "active" : ""}
              onClick={() => {
                setActiveTab("athletes");
                setError("");
              }}
            >
              <Users size={17} />
              Discover athletes
            </button>

            <button
              className="po-community-refresh"
              onClick={() =>
                activeTab === "feed"
                  ? void loadFeed()
                  : void loadAthletes(search.trim())
              }
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          {error && (
            <div className="po-community-error">
              <span>{error}</span>
              <button onClick={() => setError("")}>
                <X size={15} />
              </button>
            </div>
          )}

          {activeTab === "feed" && (
            <div className="po-community-feed">
              {loadingFeed ? (
                <div className="po-community-state">
                  <LoaderCircle className="po-community-spin" size={25} />
                  <span>Loading your community...</span>
                </div>
              ) : activities.length === 0 ? (
                <div className="po-community-empty">
                  <div className="po-community-empty-icon">
                    <Activity size={27} />
                  </div>
                  <h3>Your community starts here.</h3>
                  <p>
                    Follow athletes to see their activities here, or record
                    your first activity to share your progress.
                  </p>
                  <button
                    onClick={() => setActiveTab("athletes")}
                    className="po-community-primary"
                  >
                    Discover athletes <ArrowRight size={16} />
                  </button>
                </div>
              ) : (
                activities.map((item) => {
                  const Icon = getActivityIcon(item.type);

                  return (
                    <article
                      className="po-community-activity-card"
                      key={item.id}
                    >
                      <div className="po-community-activity-user">
                        <Avatar
                          name={item.user.name}
                          photoUrl={item.user.photoUrl}
                        />

                        <div className="po-community-user-info">
                          <strong>{item.user.name}</strong>
                          <span>
                            {item.user.location && (
                              <>
                                <MapPin size={12} />
                                {item.user.location}
                                <span className="po-community-separator">
                                  ·
                                </span>
                              </>
                            )}
                            {formatDate(item.date)}
                          </span>
                        </div>

                        <span className="po-community-activity-type">
                          <Icon size={14} />
                          {item.type}
                        </span>
                      </div>

                      <div className="po-community-activity-content">
                        <h3>
                          {item.type} completed
                        </h3>

                        <div className="po-community-metrics">
                          <div>
                            <span>Distance</span>
                            <strong>{formatDistance(item.distance)}</strong>
                          </div>
                          <div>
                            <span>Duration</span>
                            <strong>{formatDuration(item.duration)}</strong>
                          </div>
                          <div>
                            <span>Avg. pace</span>
                            <strong>{item.pace || "—"}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="po-community-social-counts">
                        <span>
                          <Heart size={14} />
                          {item.kudosCount} kudos
                        </span>
                        <span>
                          <MessageCircle size={14} />
                          {item.commentsCount} comments
                        </span>
                      </div>

                      <div className="po-community-actions">
                        <button
                          className={item.hasKudos ? "given-kudos" : ""}
                          onClick={() => void handleKudos(item)}
                        >
                          <Heart
                            size={17}
                            fill={item.hasKudos ? "currentColor" : "none"}
                          />
                          {item.hasKudos ? "Kudos given" : "Give kudos"}
                        </button>

                        <button
                          onClick={() => void openComments(item.id)}
                        >
                          <MessageCircle size={17} />
                          Comment
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          )}

          {activeTab === "athletes" && (
            <div className="po-community-athletes">
              <div className="po-community-search">
                <Search size={18} />
                <input
                  value={search}
                  onChange={(event) => handleSearch(event.target.value)}
                  placeholder="Search athletes by name or location..."
                />
                {search && (
                  <button
                    onClick={() => handleSearch("")}
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {loadingAthletes ? (
                <div className="po-community-state">
                  <LoaderCircle className="po-community-spin" size={25} />
                  <span>Finding athletes...</span>
                </div>
              ) : athletes.length === 0 ? (
                <div className="po-community-empty">
                  <div className="po-community-empty-icon">
                    <Users size={27} />
                  </div>
                  <h3>No athletes found.</h3>
                  <p>
                    Try another name or location. New PaceOrbit members
                    will appear here.
                  </p>
                </div>
              ) : (
                <div className="po-community-athlete-grid">
                  {athletes.map((athlete) => (
                    <article
                      className="po-community-athlete-card"
                      key={athlete.id}
                    >
                      <Avatar
                        name={athlete.name}
                        photoUrl={athlete.photoUrl}
                        size="large"
                      />

                      <h3>{athlete.name}</h3>

                      {athlete.location && (
                        <span className="po-community-athlete-location">
                          <MapPin size={13} />
                          {athlete.location}
                        </span>
                      )}

                      <p>
                        {athlete.bio || "On a journey to move more."}
                      </p>

                      <div className="po-community-athlete-stats">
                        <div>
                          <strong>{athlete.followersCount}</strong>
                          <span>Followers</span>
                        </div>
                        <div>
                          <strong>{athlete.followingCount}</strong>
                          <span>Following</span>
                        </div>
                        <div>
                          <strong>{athlete.activitiesCount}</strong>
                          <span>Activities</span>
                        </div>
                      </div>

                      <button
                        className={
                          athlete.isFollowing
                            ? "po-community-follow following"
                            : "po-community-follow"
                        }
                        onClick={() => void handleFollow(athlete)}
                      >
                        {athlete.isFollowing ? (
                          <>Following</>
                        ) : (
                          <>
                            <UserPlus size={16} />
                            Follow
                          </>
                        )}
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="po-community-sidebar">
          <div className="po-community-side-card">
            <div className="po-community-side-icon">
              <Heart size={20} />
            </div>
            <h3>Celebrate progress.</h3>
            <p>
              Every run, ride and walk deserves recognition. A little
              encouragement goes a long way.
            </p>
          </div>

          <div className="po-community-side-card po-community-side-highlight">
            <span className="po-community-side-label">
              YOUR COMMUNITY
            </span>
            <h3>Movement is better when shared.</h3>
            <p>
              Discover athletes, build connections and keep each other
              moving.
            </p>
            <button onClick={() => setActiveTab("athletes")}>
              Find your people <ArrowRight size={15} />
            </button>
          </div>
        </aside>
      </section>

      {commentActivityId && (
        <div
          className="po-comment-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setCommentActivityId(null);
            }
          }}
        >
          <section
            className="po-comment-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Activity comments"
          >
            <div className="po-comment-header">
              <div>
                <span>COMMUNITY CONVERSATION</span>
                <h3>Comments</h3>
                {selectedActivity && (
                  <p>
                    {selectedActivity.user.name}'s{" "}
                    {selectedActivity.type.toLowerCase()} activity
                  </p>
                )}
              </div>

              <button
                onClick={() => setCommentActivityId(null)}
                aria-label="Close comments"
              >
                <X size={20} />
              </button>
            </div>

            <div className="po-comment-list">
              {commentsLoading ? (
                <div className="po-community-state">
                  <LoaderCircle className="po-community-spin" size={23} />
                  Loading comments...
                </div>
              ) : comments.length === 0 ? (
                <div className="po-comment-empty">
                  <MessageCircle size={25} />
                  <strong>Start the conversation.</strong>
                  <span>Be the first to leave a comment.</span>
                </div>
              ) : (
                comments.map((comment) => (
                  <div className="po-comment-item" key={comment.id}>
                    <Avatar
                      name={comment.user.name}
                      photoUrl={comment.user.photoUrl}
                    />
                    <div>
                      <div className="po-comment-author">
                        <strong>{comment.user.name}</strong>
                        <span>{formatDate(comment.createdAt)}</span>
                      </div>
                      <p>{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form
              className="po-comment-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submitComment();
              }}
            >
              <input
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder="Write something encouraging..."
                maxLength={1000}
              />
              <button
                type="submit"
                disabled={!commentText.trim() || commentSubmitting}
              >
                {commentSubmitting ? (
                  <LoaderCircle className="po-community-spin" size={18} />
                ) : (
                  <Send size={17} />
                )}
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
