import * as dotenv from "dotenv";
dotenv.config();

import express, { Application } from "express";
import cookieSession from "cookie-session";
import cors from "cors";
import mongoose from "mongoose";
import {
  requireAuth,
  currentUser,
  errorHandler,
  NotFoundError,
} from "../common";
import { authRouters } from "../src/routers/auth/auth.routers";
import { courseRouter } from "../src/routers/course/course.routers";
import { sectionRouter } from "./routers/course/section.routers";
import { lectureRouter } from "./routers/course/lecture.routers";
import { examRouter } from "./routers/course/exam.routers";
import { enrollmentRouter } from "./routers/enrollment/enrollment.routers";
import { cloudRouters } from "../src/routers/cloudinary/cloud.routers";
import { stripeRouters } from "../src/routers/Stripe/stripe.routers";
import { studentRouters } from "../src/routers/student/student.routers";
import { instructorRouters } from "../src/routers/instructor/instructor.routers";
import "./service/course/cleanup.service";
import { cartRouters } from "./routers/cart/cart.routers";
import { reviewRouters } from "./routers/review/review.routers";
import { popularityRouters } from "./routers/popularity/popularity.routers";
import { trendingRouters } from "./routers/trending/trending.routers";
import { userRouters } from "./routers/user/users.routers";
import { adminRouters } from "./routers/admin/admin.routers";
import { couponRouters } from "./routers/course/coupon.routers";
import { recomendationRouter } from "./routers/recomendation/recomendation.routers";
import { certificateRouter } from "./routers/certificate/certificate.router";
import { contactRouters } from "./routers/contact/contact.routers";

const app: Application = express();

app.set("trust proxy", true);
app.use(
  cors({
    origin: process.env.Frontend_URL,
    credentials: true,
    optionsSuccessStatus: 200,
  })
);
app.use(express.urlencoded({ extended: false })); //must be true for frontend
app.use((req, res, next) => {
  if (req.originalUrl === "/webhook") return next();
  express.json()(req, res, next);
});
app.use(
  cookieSession({
    signed: false,
    secure: false, //must be true in production mode
  })
);

if (!process.env.MONGO_URL) {
  throw new Error("MONGO_URL must be defined");
}
if (!process.env.JWT_KEY) throw new Error("JWT_KEY must be defined");

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    throw new Error(err.message);
  });

// this.app.use(currentUser);

app.use(couponRouters);
app.use(studentRouters);
app.use(courseRouter);
app.use(sectionRouter);
app.use(lectureRouter);
app.use(examRouter);
app.use(enrollmentRouter);
app.use(authRouters);
app.use(cloudRouters);
app.use(stripeRouters);
app.use(instructorRouters);
app.use(cartRouters);
app.use(reviewRouters);
app.use(popularityRouters);
app.use(trendingRouters);
app.use(userRouters);
app.use(adminRouters);
app.use(recomendationRouter);
app.use(certificateRouter);
app.use(contactRouters);

app.all("*", (req, res, next) => {
  next(new NotFoundError());
});
app.use(errorHandler);
// const app = express();
// const appModule = new AppModule(app);

// appModule.start().catch(console.error);

export default app;
