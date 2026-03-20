import { Router } from "express";
import authMiddleware from "../../middlewares/auth.js";
import UserController from "./user.controller.js";

const router: Router = Router();

router.get("/me", authMiddleware(), UserController.getProfile);
router.patch("/me", authMiddleware(), UserController.updateProfile);

export const UserRoutes = router;
