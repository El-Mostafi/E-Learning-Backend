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
  NotFundError,
} from "../common";
import { authRouters } from "../src/routers/auth/auth.routers";
import { courseRouter } from "../src/routers/course/course.routers";
import { sectionRouter } from "./routers/course/section.routers";
import { lectureRouter } from "./routers/course/lecture.routers";

export class AppModule {
  constructor(public app: Application) {
    app.set("trust proxy", true);
    app.use(
      cors({
        origin: "*",
        credentials: true,
        optionsSuccessStatus: 200,
      })
    );
    app.use(express.urlencoded({ extended: false })); //must be true for frontend
    app.use(express.json());
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
      console.log(err);
    }
    this.app.use(currentUser);

    this.app.use(authRouters);
    this.app.use(courseRouter);
    this.app.use(sectionRouter);
    this.app.use(lectureRouter);

    this.app.use(errorHandler);

    this.app.all("*", (req, res, next) => {
      next(new NotFundError());
    });

    this.app.listen(3030, () => console.log("Server is running on port 3030"));
  }
}
