import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { prisma } from "./config/prisma.js";
import authRoutes from "./routes/auth.routes.js";
import activityRoutes from "./routes/activity.routes.js";
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use("/api/activities", activityRoutes);
app.get("/", (_req, res) => {
    res.json({
        success: true,
        message: "Welcome to PaceOrbit API",
    });
});
app.get("/api/health", (_req, res) => {
    res.json({
        success: true,
        status: "healthy",
        service: "PaceOrbit Backend",
    });
});
app.get("/api/health/db", async (_req, res) => {
    try {
        await prisma.$queryRaw `SELECT 1`;
        res.json({
            success: true,
            database: "connected",
            message: "Neon PostgreSQL connected successfully",
        });
    }
    catch (error) {
        console.error("Database health error:", error);
        res.status(500).json({
            success: false,
            database: "disconnected",
            message: "Database connection failed",
        });
    }
});
app.use("/api/auth", authRoutes);
app.listen(PORT, () => {
    console.log("PaceOrbit API running on http://localhost:" + PORT);
});
