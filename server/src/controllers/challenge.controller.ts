import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";

function getUserId(req: Request): string | undefined {
  return (req as AuthRequest).userId;
}

function getParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

async function getProgress(
  userId: string,
  challenge: {
    startDate: Date;
    endDate: Date;
    activityType: string;
  }
) {
  const result = await prisma.activity.aggregate({
    where: {
      userId,
      date: {
        gte: challenge.startDate,
        lte: challenge.endDate,
      },
      ...(challenge.activityType !== "All"
        ? { type: challenge.activityType }
        : {}),
    },
    _sum: {
      distance: true,
    },
    _count: {
      id: true,
    },
  });

  return {
    distance: Number((result._sum.distance ?? 0).toFixed(2)),
    activities: result._count.id,
  };
}

// GET /api/challenges
export async function getChallenges(req: Request, res: Response) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const challenges = await prisma.challenge.findMany({
      orderBy: {
        startDate: "asc",
      },
      include: {
        _count: {
          select: {
            participants: true,
          },
        },
        participants: {
          where: { userId },
          select: { id: true },
        },
      },
    });

    const formatted = await Promise.all(
      challenges.map(async (challenge) => {
        const progress = await getProgress(userId, challenge);

        return {
          id: challenge.id,
          title: challenge.title,
          description: challenge.description,
          activityType: challenge.activityType,
          goalDistance: challenge.goalDistance,
          startDate: challenge.startDate,
          endDate: challenge.endDate,
          participantsCount: challenge._count.participants,
          isJoined: challenge.participants.length > 0,
          progress: progress.distance,
          activitiesCount: progress.activities,
          status:
            new Date() < challenge.startDate
              ? "upcoming"
              : new Date() > challenge.endDate
                ? "completed"
                : "active",
        };
      })
    );

    return res.json({
      success: true,
      challenges: formatted,
    });
  } catch (error) {
    console.error("Get challenges error:", error);
    return res.status(500).json({
      message: "Unable to fetch challenges",
    });
  }
}

// GET /api/challenges/my
export async function getMyChallenges(req: Request, res: Response) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const participations = await prisma.challengeParticipant.findMany({
      where: { userId },
      include: {
        challenge: {
          include: {
            _count: {
              select: { participants: true },
            },
          },
        },
      },
      orderBy: {
        joinedAt: "desc",
      },
    });

    const challenges = await Promise.all(
      participations.map(async (participation) => {
        const challenge = participation.challenge;
        const progress = await getProgress(userId, challenge);

        return {
          id: challenge.id,
          title: challenge.title,
          description: challenge.description,
          activityType: challenge.activityType,
          goalDistance: challenge.goalDistance,
          startDate: challenge.startDate,
          endDate: challenge.endDate,
          joinedAt: participation.joinedAt,
          participantsCount: challenge._count.participants,
          progress: progress.distance,
          activitiesCount: progress.activities,
          percentage: Math.min(
            100,
            Number(
              ((progress.distance / challenge.goalDistance) * 100).toFixed(1)
            )
          ),
          isCompleted: progress.distance >= challenge.goalDistance,
        };
      })
    );

    return res.json({
      success: true,
      challenges,
    });
  } catch (error) {
    console.error("My challenges error:", error);
    return res.status(500).json({
      message: "Unable to fetch your challenges",
    });
  }
}

// POST /api/challenges/:id/join
export async function joinChallenge(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    const challengeId = getParam(req.params.id);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      return res.status(404).json({
        message: "Challenge not found",
      });
    }

    if (new Date() > challenge.endDate) {
      return res.status(400).json({
        message: "This challenge has already ended",
      });
    }

    const existing = await prisma.challengeParticipant.findUnique({
      where: {
        challengeId_userId: {
          challengeId,
          userId,
        },
      },
    });

    if (existing) {
      return res.status(409).json({
        message: "You have already joined this challenge",
      });
    }

    await prisma.challengeParticipant.create({
      data: {
        challengeId,
        userId,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Challenge joined successfully",
    });
  } catch (error) {
    console.error("Join challenge error:", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        message: "You have already joined this challenge",
      });
    }

    return res.status(500).json({
      message: "Unable to join challenge",
    });
  }
}

// DELETE /api/challenges/:id/leave
export async function leaveChallenge(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    const challengeId = getParam(req.params.id);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const result = await prisma.challengeParticipant.deleteMany({
      where: {
        challengeId,
        userId,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({
        message: "You have not joined this challenge",
      });
    }

    return res.json({
      success: true,
      message: "You left the challenge",
    });
  } catch (error) {
    console.error("Leave challenge error:", error);
    return res.status(500).json({
      message: "Unable to leave challenge",
    });
  }
}

// GET /api/challenges/:id/leaderboard
export async function getChallengeLeaderboard(
  req: Request,
  res: Response
) {
  try {
    const challengeId = getParam(req.params.id);

    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                photoUrl: true,
                location: true,
              },
            },
          },
        },
      },
    });

    if (!challenge) {
      return res.status(404).json({
        message: "Challenge not found",
      });
    }

    const userIds = challenge.participants.map((item) => item.userId);

    const grouped = userIds.length
      ? await prisma.activity.groupBy({
          by: ["userId"],
          where: {
            userId: { in: userIds },
            date: {
              gte: challenge.startDate,
              lte: challenge.endDate,
            },
            ...(challenge.activityType !== "All"
              ? { type: challenge.activityType }
              : {}),
          },
          _sum: {
            distance: true,
          },
          _count: {
            id: true,
          },
        })
      : [];

    const progressMap = new Map(
      grouped.map((item) => [
        item.userId,
        {
          distance: Number((item._sum.distance ?? 0).toFixed(2)),
          activities: item._count.id,
        },
      ])
    );

    const leaderboard = challenge.participants
      .map((participant) => {
        const progress = progressMap.get(participant.userId) ?? {
          distance: 0,
          activities: 0,
        };

        return {
          user: participant.user,
          joinedAt: participant.joinedAt,
          totalDistance: progress.distance,
          activitiesCount: progress.activities,
          percentage: Math.min(
            100,
            Number(
              ((progress.distance / challenge.goalDistance) * 100).toFixed(1)
            )
          ),
          isCompleted: progress.distance >= challenge.goalDistance,
        };
      })
      .sort((a, b) => b.totalDistance - a.totalDistance)
      .map((item, index) => ({
        rank: index + 1,
        ...item,
      }));

    return res.json({
      success: true,
      challenge: {
        id: challenge.id,
        title: challenge.title,
        goalDistance: challenge.goalDistance,
        activityType: challenge.activityType,
        startDate: challenge.startDate,
        endDate: challenge.endDate,
      },
      leaderboard,
    });
  } catch (error) {
    console.error("Challenge leaderboard error:", error);
    return res.status(500).json({
      message: "Unable to fetch challenge leaderboard",
    });
  }
}