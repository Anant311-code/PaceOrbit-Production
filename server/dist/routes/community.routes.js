import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { discoverAthletes, followAthlete, unfollowAthlete, getCommunityFeed, addKudos, removeKudos, getActivityComments, addComment, deleteComment, getLeaderboard, } from "../controllers/community.controller.js";
const router = Router();
// All community endpoints require authentication.
router.use(authenticateToken);
// Athlete discovery
router.get("/athletes", discoverAthletes);
router.get("/leaderboard", getLeaderboard);
// Follow / Unfollow
router.post("/follow/:userId", followAthlete);
router.delete("/follow/:userId", unfollowAthlete);
// Community activity feed
router.get("/feed", getCommunityFeed);
// Activity kudos
router.post("/activities/:id/kudos", addKudos);
router.delete("/activities/:id/kudos", removeKudos);
// Activity comments
router.get("/activities/:id/comments", getActivityComments);
router.post("/activities/:id/comments", addComment);
router.delete("/comments/:commentId", deleteComment);
export default router;
