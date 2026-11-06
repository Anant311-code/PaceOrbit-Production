import { prisma } from "../config/prisma.js";
function getUserId(req) {
    return req.userId;
}
function getParam(value) {
    return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
// GET /api/notifications
export async function getNotifications(req, res) {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
        const skip = (page - 1) * limit;
        const [notifications, total, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.notification.count({ where: { userId } }),
            prisma.notification.count({
                where: { userId, isRead: false },
            }),
        ]);
        return res.json({
            success: true,
            notifications,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
            unreadCount,
        });
    }
    catch (error) {
        console.error("Get notifications error:", error);
        return res.status(500).json({
            message: "Unable to fetch notifications",
        });
    }
}
// PATCH /api/notifications/:id/read
export async function markNotificationRead(req, res) {
    try {
        const userId = getUserId(req);
        const id = getParam(req.params.id);
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const result = await prisma.notification.updateMany({
            where: {
                id,
                userId,
            },
            data: {
                isRead: true,
            },
        });
        if (result.count === 0) {
            return res.status(404).json({
                message: "Notification not found",
            });
        }
        return res.json({
            success: true,
            message: "Notification marked as read",
        });
    }
    catch (error) {
        console.error("Mark notification read error:", error);
        return res.status(500).json({
            message: "Unable to update notification",
        });
    }
}
// PATCH /api/notifications/read-all
export async function markAllNotificationsRead(req, res) {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const result = await prisma.notification.updateMany({
            where: {
                userId,
                isRead: false,
            },
            data: {
                isRead: true,
            },
        });
        return res.json({
            success: true,
            message: "All notifications marked as read",
            updatedCount: result.count,
        });
    }
    catch (error) {
        console.error("Mark all notifications error:", error);
        return res.status(500).json({
            message: "Unable to update notifications",
        });
    }
}
// DELETE /api/notifications/:id
export async function deleteNotification(req, res) {
    try {
        const userId = getUserId(req);
        const id = getParam(req.params.id);
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const result = await prisma.notification.deleteMany({
            where: {
                id,
                userId,
            },
        });
        if (result.count === 0) {
            return res.status(404).json({
                message: "Notification not found",
            });
        }
        return res.json({
            success: true,
            message: "Notification deleted",
        });
    }
    catch (error) {
        console.error("Delete notification error:", error);
        return res.status(500).json({
            message: "Unable to delete notification",
        });
    }
}
