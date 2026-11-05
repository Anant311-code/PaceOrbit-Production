
import type { Request, Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import { prisma } from "../config/prisma.js";
import { createNotification } from "../utils/notification.js";

const getUserId = (req: Request): string | undefined => {
  return (req as AuthRequest).userId;
};

// GET /api/achievements
export async function getAchievements(req: Request, res: Response) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const [achievements, unlocked] = await Promise.all([
      prisma.achievement.findMany({
        orderBy: [{ points: "asc" }, { name: "asc" }],
      }),
      prisma.userAchievement.findMany({
        where: { userId },
        select: {
          achievementId: true,
          unlockedAt: true,
        },
      }),
    ]);

    const unlockedMap = new Map(
      unlocked.map((item) => [
        item.achievementId,
        item.unlockedAt,
      ])
    );

    const results = achievements.map((achievement) => ({
      ...achievement,
      isUnlocked: unlockedMap.has(achievement.id),
      unlockedAt: unlockedMap.get(achievement.id) ?? null,
    }));

    const totalPoints = results
      .filter((item) => item.isUnlocked)
      .reduce((sum, item) => sum + item.points, 0);

    return res.json({
      success: true,
      achievements: results,
      summary: {
        total: achievements.length,
        unlocked: unlocked.length,
        locked: achievements.length - unlocked.length,
        totalPoints,
      },
    });
  } catch (error) {
    console.error("Get achievements error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load achievements.",
    });
  }
}

// GET /api/achievements/mine
export async function getMyAchievements(req: Request, res: Response) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const unlocked = await prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: true,
      },
      orderBy: {
        unlockedAt: "desc",
      },
    });

    const totalPoints = unlocked.reduce(
      (sum, item) => sum + item.achievement.points,
      0
    );

    return res.json({
      success: true,
      achievements: unlocked,
      totalUnlocked: unlocked.length,
      totalPoints,
    });
  } catch (error) {
    console.error("Get my achievements error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load your achievements.",
    });
  }
}

// POST /api/achievements/check
// This endpoint allows authenticated users to recalculate their progress.
export async function checkAchievements(req: Request, res: Response) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const activities = await prisma.activity.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        distance: true,
        date: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    const totalDistance = activities.reduce(
      (sum, activity) => sum + activity.distance,
      0
    );

    const unlockedKeys = new Set<string>();

    if (activities.length >= 1) {
      unlockedKeys.add("FIRST_STEPS");
    }

    if (totalDistance >= 10) unlockedKeys.add("TEN_KM");
    if (totalDistance >= 25) unlockedKeys.add("TWENTY_FIVE_KM");
    if (totalDistance >= 50) unlockedKeys.add("FIFTY_KM");
    if (totalDistance >= 100) unlockedKeys.add("CENTURY_RUNNER");
    if (totalDistance >= 250) unlockedKeys.add("TWO_FIFTY_KM");
    if (totalDistance >= 500) unlockedKeys.add("FIVE_HUNDRED_KM");

    // Calculate streak using unique activity calendar dates.
    const activityDays = Array.from(
      new Set(
        activities.map((activity) => {
          const date = new Date(activity.date);
          return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0"),
          ].join("-");
        })
      )
    ).sort();

    let currentStreak = 0;
    let longestStreak = 0;
    let previousDate: Date | null = null;

    for (const day of activityDays) {
      const currentDate = new Date(`${day}T00:00:00`);
      const gap = previousDate
        ? Math.round(
            (currentDate.getTime() - previousDate.getTime()) / 86400000
          )
        : 0;

      currentStreak = !previousDate || gap === 1
        ? currentStreak + 1
        : 1;

      longestStreak = Math.max(longestStreak, currentStreak);
      previousDate = currentDate;
    }

    if (longestStreak >= 3) {
      unlockedKeys.add("THREE_DAY_STREAK");
    }

    if (longestStreak >= 7) {
      unlockedKeys.add("SEVEN_DAY_STREAK");
    }

    // Early Bird: at least one activity before 7 AM.
    const hasEarlyActivity = activities.some((activity) => {
      const hour = new Date(activity.date).getHours();
      return hour < 7;
    });

    if (hasEarlyActivity) {
      unlockedKeys.add("EARLY_BIRD");
    }

    const eligibleAchievements = await prisma.achievement.findMany({
      where: {
        key: {
          in: Array.from(unlockedKeys),
        },
      },
    });

    const alreadyUnlocked = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    });

    const alreadyUnlockedIds = new Set(
      alreadyUnlocked.map((item) => item.achievementId)
    );

    const newAchievements = eligibleAchievements.filter(
      (item) => !alreadyUnlockedIds.has(item.id)
    );

    const actor = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    for (const achievement of newAchievements) {
      const unlockedAchievement = await prisma.userAchievement.upsert({
        where: {
          userId_achievementId: {
            userId,
            achievementId: achievement.id,
          },
        },
        create: {
          userId,
          achievementId: achievement.id,
        },
        update: {},
      });

      await createNotification({
  userId,
  type: "CHALLENGE",
  title: "Achievement unlocked!",
  message: `Congratulations ${actor?.name ?? "Athlete"}! You earned ${achievement.name}.`,
  link: "/profile",
});
    }

    const totalUnlocked = await prisma.userAchievement.count({
      where: { userId },
    });

    return res.json({
      success: true,
      message: "Achievement progress checked successfully.",
      stats: {
        totalDistance: Number(totalDistance.toFixed(2)),
        totalActivities: activities.length,
        longestStreak,
        newlyUnlocked: newAchievements.map((item) => ({
          id: item.id,
          key: item.key,
          name: item.name,
          points: item.points,
          icon: item.icon,
        })),
        totalUnlocked,
      },
    });
  } catch (error) {
    console.error("Check achievements error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to check achievements.",
    });
  }
}
