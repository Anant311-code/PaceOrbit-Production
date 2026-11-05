
import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  Heart,
  MessageCircle,
  UserPlus,
  Trophy,
  Check,
  CheckCheck,
  Trash2,
  X,
  Loader2,
  BellRing,
} from "lucide-react";
import api from "../lib/api";
import "./NotificationBell.css";

type NotificationType = "FOLLOW" | "KUDOS" | "COMMENT" | "CHALLENGE";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/notifications?page=1&limit=30");

      setNotifications(response.data.notifications ?? []);
      setUnreadCount(response.data.unreadCount ?? 0);
    } catch (err) {
      console.error("Notifications fetch error:", err);
      setError("Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    const interval = window.setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => window.clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    const selected = notifications.find((item) => item.id === id);
    if (!selected || selected.isRead) return;

    try {
      await api.patch(`/notifications/${id}/read`);

      setNotifications((current) =>
        current.map((item) =>
          item.id === id ? { ...item, isRead: true } : item
        )
      );

      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err) {
      console.error("Mark notification read error:", err);
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;

    try {
      await api.patch("/notifications/read-all");

      setNotifications((current) =>
        current.map((item) => ({ ...item, isRead: true }))
      );

      setUnreadCount(0);
    } catch (err) {
      console.error("Mark all notifications read error:", err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);

      const deleted = notifications.find((item) => item.id === id);

      setNotifications((current) =>
        current.filter((item) => item.id !== id)
      );

      if (deleted && !deleted.isRead) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
    } catch (err) {
      console.error("Delete notification error:", err);
    }
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "FOLLOW":
        return <UserPlus size={18} />;
      case "KUDOS":
        return <Heart size={18} />;
      case "COMMENT":
        return <MessageCircle size={18} />;
      case "CHALLENGE":
        return <Trophy size={18} />;
      default:
        return <Bell size={18} />;
    }
  };

  const getTime = (date: string) => {
    const timestamp = new Date(date).getTime();
    const difference = Math.max(0, Date.now() - timestamp);

    const minutes = Math.floor(difference / 60000);
    const hours = Math.floor(difference / 3600000);
    const days = Math.floor(difference / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="notification-root">
      <button
        className={`notification-trigger ${open ? "active" : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={19} />

        {unreadCount > 0 && (
          <span className="notification-count">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            className="notification-backdrop"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />

          <section className="notification-panel">
            <div className="notification-panel-header">
              <div>
                <div className="notification-title-row">
                  <h3>Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="notification-unread-pill">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <p>Stay connected with your activity.</p>
              </div>

              <button
                className="notification-close"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                className="notification-mark-all"
                onClick={markAllAsRead}
              >
                <CheckCheck size={15} />
                Mark all as read
              </button>
            )}

            <div className="notification-list">
              {loading && notifications.length === 0 ? (
                <div className="notification-state">
                  <Loader2 className="notification-spinner" size={25} />
                  <span>Loading notifications...</span>
                </div>
              ) : error && notifications.length === 0 ? (
                <div className="notification-state">
                  <BellRing size={27} />
                  <span>{error}</span>
                  <button onClick={fetchNotifications}>Try again</button>
                </div>
              ) : notifications.length === 0 ? (
                <div className="notification-state">
                  <div className="notification-empty-icon">
                    <Bell size={24} />
                  </div>
                  <strong>You're all caught up!</strong>
                  <span>Your new notifications will appear here.</span>
                </div>
              ) : (
                notifications.map((notification) => (
                  <article
                    key={notification.id}
                    className={`notification-item ${
                      !notification.isRead ? "unread" : ""
                    }`}
                  >
                    <div
                      className={`notification-icon notification-${notification.type.toLowerCase()}`}
                    >
                      {getIcon(notification.type)}
                    </div>

                    <div className="notification-content">
                      <div className="notification-item-heading">
                        <strong>{notification.title}</strong>
                        {!notification.isRead && (
                          <span className="notification-unread-dot" />
                        )}
                      </div>

                      <p>{notification.message}</p>

                      <span className="notification-time">
                        {getTime(notification.createdAt)}
                      </span>

                      {!notification.isRead && (
                        <button
                          className="notification-read-action"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check size={13} />
                          Mark as read
                        </button>
                      )}
                    </div>

                    <button
                      className="notification-delete"
                      onClick={() => deleteNotification(notification.id)}
                      aria-label="Delete notification"
                      title="Delete notification"
                    >
                      <Trash2 size={15} />
                    </button>
                  </article>
                ))
              )}
            </div>

            <div className="notification-panel-footer">
              <span>PACEORBIT</span>
              <span>Keep moving forward.</span>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
