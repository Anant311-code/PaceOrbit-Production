import { prisma } from "../config/prisma.js";
export async function createNotification(input) {
    if (input.actorId && input.actorId === input.userId) {
        return null;
    }
    try {
        return await prisma.notification.create({
            data: {
                userId: input.userId,
                actorId: input.actorId ?? null,
                type: input.type,
                title: input.title,
                message: input.message,
                link: input.link ?? null,
            },
        });
    }
    catch (error) {
        // A notification failure should not cancel the main user action.
        console.error("Create notification error:", error);
        return null;
    }
}
