import { Router } from "express";
import { generateDescription } from "./ai.controller.js";

const router: Router = Router();

router.post("/generate-description", generateDescription);

export const AiRoutes: Router = router;
