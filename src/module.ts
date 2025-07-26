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

export class AppModule {
  constructor(public app: Application) {
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
  }
  async start() {
    if (!process.env.MONGO_URL) {
      throw new Error("MONGO_URL must be defined");
    }
    if (!process.env.JWT_KEY) throw new Error("JWT_KEY must be defined");

    try {
      await mongoose.connect(process.env.MONGO_URL);
      console.log("Connected to MongoDB");
    } catch (err: any) {
      throw new Error(err);
    }
    // this.app.use(currentUser);

    this.app.use(couponRouters);
    this.app.use(studentRouters);
    this.app.use(courseRouter);
    this.app.use(sectionRouter);
    this.app.use(lectureRouter);
    this.app.use(examRouter);
    this.app.use(enrollmentRouter);
    this.app.use(authRouters);
    this.app.use(cloudRouters);
    this.app.use(stripeRouters);
    this.app.use(instructorRouters);
    this.app.use(cartRouters);
    this.app.use(reviewRouters);
    this.app.use(popularityRouters);
    this.app.use(trendingRouters);
    this.app.use(userRouters);
    this.app.use(adminRouters);
    this.app.use(recomendationRouter);
    this.app.use(certificateRouter);
    this.app.use(contactRouters);

    this.app.all("*", (req, res, next) => {
      next(new NotFoundError());
    });
    this.app.use(errorHandler);

    // this.app.listen(process.env.PORT || 8031, () => console.log("Server is running on "+process.env.PORT || 8031));
  }
}
