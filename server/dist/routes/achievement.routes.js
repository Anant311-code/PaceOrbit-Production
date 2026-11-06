import { Router } from "express";
import { getAchievements, getMyAchievements, checkAchievements, } from "../controllers/achievement.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
const router = Router();
router.use(authenticateToken);
router.get("/", getAchievements);
router.get("/mine", getMyAchievements);
router.post("/check", checkAchievements);
export default router;
