import { prisma } from "../config/prisma.js";
import { createNotification } from "./notification.js";
export async function checkAndUnlockAchievements(userId) {
    const activities = await prisma.activity.findMany({
        where: { userId },
        select: {
            id: true,
            distance: true,
            date: true,
        },
        orderBy: { date: "asc" },
    });
    const totalDistance = activities.reduce((sum, activity) => sum + activity.distance, 0);
    const unlockedKeys = new Set();
    if (activities.length >= 1)
        unlockedKeys.add("FIRST_STEPS");
    if (totalDistance >= 10)
        unlockedKeys.add("TEN_KM");
    if (totalDistance >= 25)
        unlockedKeys.add("TWENTY_FIVE_KM");
    if (totalDistance >= 50)
        unlockedKeys.add("FIFTY_KM");
    if (totalDistance >= 100)
        unlockedKeys.add("CENTURY_RUNNER");
    if (totalDistance >= 250)
        unlockedKeys.add("TWO_FIFTY_KM");
    if (totalDistance >= 500)
        unlockedKeys.add("FIVE_HUNDRED_KM");
    // Calculate consecutive activity-day streaks.
    const activityDays = Array.from(new Set(activities.map((activity) => {
        const date = new Date(activity.date);
        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0"),
        ].join("-");
    }))).sort();
    let currentStreak = 0;
    let longestStreak = 0;
    let previousDate = null;
    for (const day of activityDays) {
        const currentDate = new Date(`${day}T00:00:00`);
        const gap = previousDate
            ? Math.round((currentDate.getTime() - previousDate.getTime()) / 86400000)
            : 0;
        currentStreak =
            !previousDate || gap === 1 ? currentStreak + 1 : 1;
        longestStreak = Math.max(longestStreak, currentStreak);
        previousDate = currentDate;
    }
    if (longestStreak >= 3) {
        unlockedKeys.add("THREE_DAY_STREAK");
    }
    if (longestStreak >= 7) {
        unlockedKeys.add("SEVEN_DAY_STREAK");
    }
    const hasEarlyActivity = activities.some((activity) => new Date(activity.date).getHours() < 7);
    if (hasEarlyActivity) {
        unlockedKeys.add("EARLY_BIRD");
    }
    const [eligibleAchievements, existingUnlocks, user] = await Promise.all([
        prisma.achievement.findMany({
            where: { key: { in: Array.from(unlockedKeys) } },
        }),
        prisma.userAchievement.findMany({
            where: { userId },
            select: { achievementId: true },
        }),
        prisma.user.findUnique({
            where: { id: userId },
            select: { name: true },
        }),
    ]);
    const existingIds = new Set(existingUnlocks.map((item) => item.achievementId));
    const newlyUnlocked = eligibleAchievements.filter((achievement) => !existingIds.has(achievement.id));
    const unlockedResults = [];
    for (const achievement of newlyUnlocked) {
        const result = await prisma.userAchievement.upsert({
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
        unlockedResults.push({
            ...achievement,
            unlockedAt: result.unlockedAt,
        });
        // Achievement notification. No actorId means no self-notification.
        await createNotification({
            userId,
            type: "CHALLENGE",
            title: "Achievement unlocked!",
            message: `Congratulations ${user?.name ?? "Athlete"}! You earned ${achievement.name}.`,
            link: "/profile",
        });
    }
    return {
        totalDistance: Number(totalDistance.toFixed(2)),
        totalActivities: activities.length,
        longestStreak,
        newlyUnlocked: unlockedResults,
    };
}
