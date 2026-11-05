
import type { Request, Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import { prisma } from "../config/prisma.js";
import { createNotification } from "../utils/notification.js";

function getParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

const getUserId = (req: Request): string | undefined => {
  return (req as AuthRequest).userId;
};

// GET /api/community/athletes?q=anant&page=1
export async function discoverAthletes(req: Request, res: Response) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const q = String(req.query.q ?? "").trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 12));

    const [athletes, total] = await Promise.all([
      prisma.user.findMany({
        where: {
          id: { not: userId },
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" as const } },
                  { location: { contains: q, mode: "insensitive" as const } },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          name: true,
          location: true,
          bio: true,
          photoUrl: true,
          _count: {
            select: {
              followers: true,
              following: true,
              activities: true,
            },
          },
          followers: {
            where: { followerId: userId },
            select: { id: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({
        where: {
          id: { not: userId },
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" as const } },
                  { location: { contains: q, mode: "insensitive" as const } },
                ],
              }
            : {}),
        },
      }),
    ]);

    const results = athletes.map((athlete) => ({
      id: athlete.id,
      name: athlete.name,
      location: athlete.location,
      bio: athlete.bio,
      photoUrl: athlete.photoUrl,
      followersCount: athlete._count.followers,
      followingCount: athlete._count.following,
      activitiesCount: athlete._count.activities,
      isFollowing: athlete.followers.length > 0,
    }));

    return res.json({
      success: true,
      athletes: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Discover athletes error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to discover athletes.",
    });
  }
}

// POST /api/community/follow/:userId
export async function followAthlete(req: Request, res: Response) {
  try {
    const followerId = getUserId(req);
    const followingId = getParam(req.params.userId);

    if (!followerId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!followingId) {
      return res.status(400).json({
        success: false,
        message: "Athlete ID is required.",
      });
    }

    if (followerId === followingId) {
      return res.status(400).json({
        success: false,
        message: "You cannot follow yourself.",
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: followingId },
      select: { id: true },
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Athlete not found.",
      });
    }

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (existingFollow) {
      return res.status(409).json({
        success: false,
        message: "You are already following this athlete.",
      });
    }

    await prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    });

    const actor = await prisma.user.findUnique({
      where: { id: followerId },
      select: { name: true },
    });

    await createNotification({
      userId: followingId,
      actorId: followerId,
      type: "FOLLOW",
      title: "New follower",
      message: `${actor?.name ?? "Someone"} started following you.`,
      link: "/community",
    });

    return res.status(201).json({
      success: true,
      message: "Athlete followed successfully.",
    });
  } catch (error) {
    console.error("Follow athlete error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to follow athlete.",
    });
  }
}

// DELETE /api/community/follow/:userId
export async function unfollowAthlete(req: Request, res: Response) {
  try {
    const followerId = getUserId(req);
    const followingId = getParam(req.params.userId);

    if (!followerId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const result = await prisma.follow.deleteMany({
      where: {
        followerId,
        followingId,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Follow relationship not found.",
      });
    }

    return res.json({
      success: true,
      message: "Athlete unfollowed successfully.",
    });
  } catch (error) {
    console.error("Unfollow athlete error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to unfollow athlete.",
    });
  }
}

// GET /api/community/feed?page=1
export async function getCommunityFeed(req: Request, res: Response) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 15));

    const followedUsers = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    // Include the current user's own activities as well.
    const visibleUserIds = [
      userId,
      ...followedUsers.map((follow) => follow.followingId),
    ];

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where: {
          userId: { in: visibleUserIds },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              location: true,
              photoUrl: true,
            },
          },
          _count: {
            select: {
              kudos: true,
              comments: true,
            },
          },
          kudos: {
            where: { userId },
            select: { id: true },
          },
        },
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.activity.count({
        where: {
          userId: { in: visibleUserIds },
        },
      }),
    ]);

    const results = activities.map((activity) => ({
      ...activity,
      kudosCount: activity._count.kudos,
      commentsCount: activity._count.comments,
      hasKudos: activity.kudos.length > 0,
      _count: undefined,
      kudos: undefined,
    }));

    return res.json({
      success: true,
      activities: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Community feed error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load community feed.",
    });
  }
}

// POST /api/community/activities/:id/kudos
export async function addKudos(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    const activityId = getParam(req.params.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      select: { id: true, userId: true },
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activity not found.",
      });
    }

    if (activity.userId === userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot give kudos to your own activity.",
      });
    }

    const existingKudos = await prisma.kudos.findUnique({
      where: {
        userId_activityId: {
          userId,
          activityId,
        },
      },
    });

    if (existingKudos) {
      return res.status(409).json({
        success: false,
        message: "You have already given kudos.",
      });
    }

    await prisma.kudos.create({
      data: {
        userId,
        activityId,
      },
    });

    const actor = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    await createNotification({
      userId: activity.userId,
      actorId: userId,
      type: "KUDOS",
      title: "New kudos",
      message: `${actor?.name ?? "Someone"} gave kudos to your activity.`,
      link: "/community",
    });

    return res.status(201).json({
      success: true,
      message: "Kudos added successfully.",
    });
  } catch (error) {
    console.error("Add kudos error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to add kudos.",
    });
  }
}

// DELETE /api/community/activities/:id/kudos
export async function removeKudos(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    const activityId = getParam(req.params.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const result = await prisma.kudos.deleteMany({
      where: {
        userId,
        activityId,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Kudos not found.",
      });
    }

    return res.json({
      success: true,
      message: "Kudos removed successfully.",
    });
  } catch (error) {
    console.error("Remove kudos error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to remove kudos.",
    });
  }
}

// GET /api/community/activities/:id/comments
export async function getActivityComments(req: Request, res: Response) {
  try {
    const activityId = getParam(req.params.id);

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      select: { id: true },
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activity not found.",
      });
    }

    const comments = await prisma.comment.findMany({
      where: { activityId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return res.json({
      success: true,
      comments,
    });
  } catch (error) {
    console.error("Get comments error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load comments.",
    });
  }
}

// POST /api/community/activities/:id/comments
export async function addComment(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    const activityId = getParam(req.params.id);
    const content =
      typeof req.body?.content === "string"
        ? req.body.content.trim()
        : "";

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!content) {
      return res.status(400).json({
        success: false,
        message: "Comment cannot be empty.",
      });
    }

    if (content.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Comment cannot exceed 1000 characters.",
      });
    }

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      select: { id: true, userId: true },
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activity not found.",
      });
    }

    const comment = await prisma.comment.create({
      data: {
        userId,
        activityId,
        content,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
          },
        },
      },
    });

    const actorName = comment.user.name ?? "Someone";
    const preview =
      content.length > 120
        ? `${content.slice(0, 117)}...`
        : content;

    await createNotification({
      userId: activity.userId,
      actorId: userId,
      type: "COMMENT",
      title: "New comment",
      message: `${actorName} commented on your activity: "${preview}"`,
      link: "/community",
    });

    return res.status(201).json({
      success: true,
      message: "Comment added successfully.",
      comment,
    });
  } catch (error) {
    console.error("Add comment error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to add comment.",
    });
  }
}

// DELETE /api/community/comments/:commentId
export async function deleteComment(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    const commentId = getParam(req.params.commentId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const result = await prisma.comment.deleteMany({
      where: {
        id: commentId,
        userId,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Comment not found or you do not own it.",
      });
    }

    return res.json({
      success: true,
      message: "Comment deleted successfully.",
    });
  } catch (error) {
    console.error("Delete comment error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to delete comment.",
    });
  }
}

// GET /api/community/leaderboard
export async function getLeaderboard(req: Request, res: Response) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const periodParam = getParam(
      req.query.period as string | string[] | undefined
    );

    const typeParam = getParam(
      req.query.type as string | string[] | undefined
    );

    const period = periodParam || "week";
    const allowedPeriods = ["week", "month", "all"];

    if (!allowedPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        message: "Period must be week, month or all.",
      });
    }

    const allowedTypes = ["Running", "Cycling", "Walking"];

    if (typeParam && !allowedTypes.includes(typeParam)) {
      return res.status(400).json({
        success: false,
        message: "Invalid activity type.",
      });
    }

    const now = new Date();
    let startDate: Date | undefined;

    if (period === "week") {
      // Monday 00:00 UTC
      startDate = new Date(now);
      const day = startDate.getUTCDay();
      const daysSinceMonday = (day + 6) % 7;

      startDate.setUTCDate(startDate.getUTCDate() - daysSinceMonday);
      startDate.setUTCHours(0, 0, 0, 0);
    }

    if (period === "month") {
      startDate = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
      );
    }

    const where = {
      ...(startDate ? { date: { gte: startDate, lte: now } } : {}),
      ...(typeParam ? { type: typeParam } : {}),
    };

    const grouped = await prisma.activity.groupBy({
      by: ["userId"],
      where,
      _sum: {
        distance: true,
      },
      _count: {
        id: true,
      },
      orderBy: [
        {
          _sum: {
            distance: "desc",
          },
        },
        {
          userId: "asc",
        },
      ],
    });

    const userIds = grouped.map((item) => item.userId);

    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        name: true,
        photoUrl: true,
        location: true,
      },
    });

    const userMap = new Map(users.map((user) => [user.id, user]));

    const ranked = grouped.map((item, index) => {
      const user = userMap.get(item.userId);

      return {
        rank: index + 1,
        userId: item.userId,
        name: user?.name ?? "Athlete",
        photoUrl: user?.photoUrl ?? null,
        location: user?.location ?? null,
        totalDistance: Number(
          (item._sum.distance ?? 0).toFixed(2)
        ),
        activitiesCount: item._count.id,
        isCurrentUser: item.userId === userId,
      };
    });

    const currentUser = ranked.find(
      (item) => item.userId === userId
    );

    return res.json({
      success: true,
      period,
      activityType: typeParam || "All",
      periodStart: startDate?.toISOString() ?? null,
      periodEnd: now.toISOString(),
      leaderboard: ranked.slice(0, 50),
      currentUserRank: currentUser ?? null,
      totalAthletes: ranked.length,
    });
  } catch (error) {
    console.error("Leaderboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load leaderboard.",
    });
  }
}
