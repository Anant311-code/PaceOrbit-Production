
import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";

export interface DashboardActivity {
  id: string;
  userId: string;
  type: "Running" | "Cycling" | "Walking";
  distance: number;
  duration: number;
  pace: string | null;
  speed: number | null;
  date: string;
  routePoints?: [number, number][] | null;
  createdAt: string;
}

interface DashboardResponse {
  activities: DashboardActivity[];
}

function getWeekStart(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const day = start.getDay();
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));

  return start;
}

function formatPace(secondsPerKm: number) {
  if (!Number.isFinite(secondsPerKm) || secondsPerKm <= 0) {
    return "--:--";
  }

  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getCurrentStreak(records: DashboardActivity[]) {
  const activeDates = new Set(
    records.map((activity) => {
      const date = new Date(activity.date);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    })
  );

  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  if (!activeDates.has(cursor.getTime())) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;

  while (activeDates.has(cursor.getTime())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function useDashboardStats() {
  const [activities, setActivities] = useState<DashboardActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadActivities() {
      try {
        setLoading(true);
        setError("");

        const response = await api.get<DashboardResponse>("/activities");

        if (active) {
          setActivities(
            Array.isArray(response.data.activities)
              ? response.data.activities
              : []
          );
        }
      } catch {
        if (active) {
          setError("Unable to load your activity statistics.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadActivities();

    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = getWeekStart(now);
    const nextWeekStart = new Date(weekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);

    const previousWeekStart = new Date(weekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);

    const thisWeek = activities.filter((activity) => {
      const date = new Date(activity.date);
      return date >= weekStart && date < nextWeekStart;
    });

    const previousWeek = activities.filter((activity) => {
      const date = new Date(activity.date);
      return date >= previousWeekStart && date < weekStart;
    });

    const weeklyDistance = thisWeek.reduce(
      (sum, activity) => sum + activity.distance,
      0
    );

    const weeklyDuration = thisWeek.reduce(
      (sum, activity) => sum + activity.duration,
      0
    );

    const previousDistance = previousWeek.reduce(
      (sum, activity) => sum + activity.distance,
      0
    );

    const paceActivities = thisWeek.filter(
      (activity) =>
        activity.type !== "Cycling" && activity.distance > 0
    );

    const paceDistance = paceActivities.reduce(
      (sum, activity) => sum + activity.distance,
      0
    );

    const paceDuration = paceActivities.reduce(
      (sum, activity) => sum + activity.duration,
      0
    );

    const averagePace =
      paceDistance > 0
        ? formatPace(paceDuration / paceDistance)
        : "--:--";

    const weeklyData = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);

      const distance = thisWeek
        .filter((activity) => {
          const activityDate = new Date(activity.date);
          return activityDate.toDateString() === date.toDateString();
        })
        .reduce((sum, activity) => sum + activity.distance, 0);

      return {
        day: date.toLocaleDateString("en-US", { weekday: "short" }),
        distance: Number(distance.toFixed(2)),
      };
    });

    const distanceChange =
      previousDistance > 0
        ? ((weeklyDistance - previousDistance) / previousDistance) * 100
        : null;

    return {
      weeklyDistance,
      weeklyDuration,
      averagePace,
      activityCount: thisWeek.length,
      streak: getCurrentStreak(activities),
      weeklyData,
      distanceChange,
      latestActivities: [...activities].sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    };
  }, [activities]);

  return {
    activities,
    stats,
    loading,
    error,
    refreshActivities: async () => {
      try {
        setError("");
        const response = await api.get<DashboardResponse>("/activities");
        setActivities(
          Array.isArray(response.data.activities)
            ? response.data.activities
            : []
        );
      } catch {
        setError("Unable to refresh your activity statistics.");
      }
    },
  };
}
