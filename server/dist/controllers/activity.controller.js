import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
const activitySchema = z.object({
    type: z.enum(["Running", "Cycling", "Walking"]),
    distance: z.number().positive().max(1000),
    duration: z.number().int().positive().max(604800),
    pace: z.string().max(30).nullable().optional(),
    speed: z.number().nonnegative().max(500).nullable().optional(),
    date: z.coerce.date(),
    routePoints: z
        .array(z.tuple([z.number(), z.number()]))
        .max(20000)
        .nullable()
        .optional(),
});
export async function createActivity(req, res) {
    try {
        if (!req.userId) {
            res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
            return;
        }
        const parsed = activitySchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                message: "Invalid activity details.",
                errors: parsed.error.flatten().fieldErrors,
            });
            return;
        }
        const { routePoints, ...activityData } = parsed.data;
        const activity = await prisma.activity.create({
            data: {
                ...activityData,
                userId: req.userId,
                routePoints: routePoints === null
                    ? Prisma.DbNull
                    : routePoints === undefined
                        ? undefined
                        : routePoints,
            },
        });
        res.status(201).json({
            success: true,
            message: "Activity saved successfully.",
            activity,
        });
    }
    catch (error) {
        console.error("Create activity error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to save activity.",
        });
    }
}
export async function getActivities(req, res) {
    try {
        if (!req.userId) {
            res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
            return;
        }
        const activities = await prisma.activity.findMany({
            where: { userId: req.userId },
            orderBy: { date: "desc" },
            take: 100,
        });
        res.json({
            success: true,
            count: activities.length,
            activities,
        });
    }
    catch (error) {
        console.error("Fetch activities error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to fetch activities.",
        });
    }
}
export async function getActivityById(req, res) {
    try {
        if (!req.userId) {
            res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
            return;
        }
        const activityId = req.params.id;
        if (typeof activityId !== "string") {
            res.status(400).json({
                success: false,
                message: "Invalid activity ID.",
            });
            return;
        }
        const activity = await prisma.activity.findFirst({
            where: {
                id: activityId,
                userId: req.userId,
            },
        });
        if (!activity) {
            res.status(404).json({
                success: false,
                message: "Activity not found.",
            });
            return;
        }
        res.json({
            success: true,
            activity,
        });
    }
    catch (error) {
        console.error("Fetch activity error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to fetch activity.",
        });
    }
}
export async function deleteActivity(req, res) {
    try {
        if (!req.userId) {
            res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
            return;
        }
        const activityId = req.params.id;
        if (typeof activityId !== "string") {
            res.status(400).json({
                success: false,
                message: "Invalid activity ID.",
            });
            return;
        }
        const result = await prisma.activity.deleteMany({
            where: {
                id: activityId,
                userId: req.userId,
            },
        });
        if (result.count === 0) {
            res.status(404).json({
                success: false,
                message: "Activity not found.",
            });
            return;
        }
        res.json({
            success: true,
            message: "Activity deleted successfully.",
        });
    }
    catch (error) {
        console.error("Delete activity error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to delete activity.",
        });
    }
}
