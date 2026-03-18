/**
 * NODE PACKAGES
 */
import express, { Application } from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";

/**
 * LIBS
 */
import { auth } from "./lib/auth";

/**
 * ROUTES
 */
// import { UserRoutes } from "./modules/user/user.route";
// import { TutorRoutes } from "./modules/tutor/tutor.route";
// import { BookingRoutes } from "./modules/booking/booking.route";
// import { AdminRoutes } from "./modules/admin/admin.route";
// import { CategoryRoutes } from "./modules/category/category.route";
// import { ReviewRoutes } from "./modules/review/review.route";

/**
 * MIDDLEWARES
 */
import { errorHandler } from "./middlewares/errorHandler";

/**
 * CONFIG
 */
import config from "./config";

const app: Application = express();

app.set("trust proxy", true);

app.use(
  cors({
    origin: [
      config.client_url,
      "http://192.168.9.142:3000", // Allow mobile access
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  }),
);

app.use(express.json());

app.all("/api/auth/{*any}", toNodeHandler(auth));

//  Routes
// app.use("/api/users", UserRoutes);
// app.use("/api/tutors", TutorRoutes);
// app.use("/api/bookings", BookingRoutes);
// app.use("/api/admin", AdminRoutes);
// app.use("/api/categories", CategoryRoutes);
// app.use("/api/reviews", ReviewRoutes);

app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

app.get("/", (_req, res) => {
  res.send("CourtConnect API is running");
});

app.use(errorHandler);

export default app;
