import { ReviewService } from "../../service/review/review.service";
import {
  BadRequestError,
  currentUser,
  requireAuth,
  ValidationRequest,
} from "../../../common";
import { NextFunction, Request, Response, Router } from "express";
import { AddReviewDto } from "./dtos/addReview.dto";
import { body } from "express-validator";
import mongoose from "mongoose";
import { roleIsStudent } from "../../../common/src/middllewares/validate-roles";

const router = Router();
const reviewService = new ReviewService();
router.get(
  "/api/my-reviews",
  requireAuth,
  currentUser,
  roleIsStudent,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.currentUser!.userId;
      const result = await reviewService.findUserReviews(userId);
      if (!result.success) {
        return next(new BadRequestError(result.message!));
      }
      const reviews = result.reviews!;
      res.send(reviews);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/api/my-courses/:courseId/my-review",
  requireAuth,
  currentUser,
  roleIsStudent,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.currentUser!.userId;
      const courseId = new mongoose.Types.ObjectId(req.params.reviewId);
      const result = await reviewService.findOneUserReviewById(
        userId,
        courseId
      );
      if (!result.success) {
        return next(new BadRequestError(result.message!));
      }
      const review = result.review!;
      res.send(review);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/api/courses/:courseId/reviews",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = new mongoose.Types.ObjectId(req.params.courseId);
      const result = await reviewService.findCourseReviews(courseId);
      if (!result.success) {
        return next(new BadRequestError(result.message!));
      }
      res.status(200).send(result.reviews!);
    } catch (error: any) {
      next(error);
    }
  }
);

router.post(
  "/api/courses/:courseId/add-review",
  [
    body("rating")
      .isInt({ min: 0, max: 5 })
      .withMessage("Rating must be an integer between 0 and 5"),
    body("text")
      .isString()
      .withMessage("Text must be a string")
      .notEmpty()
      .withMessage("Text is required"),
  ],
  ValidationRequest,
  requireAuth,
  currentUser,
  roleIsStudent,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // console.log("add review route");
      const userId = req.currentUser!.userId;
      const courseId = new mongoose.Types.ObjectId(req.params.courseId);
      const { rating, text } = req.body;
      const addReviewDto: AddReviewDto = {
        course: courseId,
        rating: rating,
        text: text,
      };
      const result = await reviewService.create(userId, addReviewDto);
      if (!result.success) {
        return next(new BadRequestError(result.message));
      }
      res.status(201).send(result.message);
    } catch (error: any) {
      next(error);
    }
  }
);

router.put(
  "/api/courses/:courseId/reviews/:reviewId/update-review",
  [
    body("rating")
      .isInt({ min: 0, max: 5 })
      .withMessage("Rating must be an integer between 0 and 5"),
    body("text")
      .isString()
      .withMessage("Text must be a string")
      .notEmpty()
      .withMessage("Text is required"),
  ],
  ValidationRequest,
  requireAuth,
  currentUser,
  roleIsStudent,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = new mongoose.Types.ObjectId(req.params.courseId);
      const reviewId = req.params.reviewId;
      const userId = req.currentUser!.userId;
      const { rating, text } = req.body;
      const addReviewDto: AddReviewDto = {
        course: courseId,
        rating: rating,
        text: text,
      };
      const result = await reviewService.updateReview(
        userId,
        reviewId,
        addReviewDto
      );
      if (!result.success) {
        return next(new BadRequestError(result.message));
      }
      res.status(200).send(result.message);
    } catch (error: any) {
      next(error);
    }
  }
);

router.delete(
  "/api/my-reviews/:reviewId/remove-review",
  requireAuth,
  currentUser,
  roleIsStudent,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.currentUser!.userId;
      const reviewId = req.params.reviewId;
      const result = await reviewService.removeReview(userId, reviewId);
      if (!result.success) {
        return next(new BadRequestError(result.message));
      }
      res.status(200).send(result.message);
    } catch (error: any) {
      next(error);
    }
  }
);

router.get(
  "/api/reviews/top-reviews",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Assuming you have an instance of the service that contains getTopReviews
      const topReviews = await reviewService.getTopReviews(5); // Get top 5 reviews
      res.status(200).json(topReviews);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/api/reviews/count",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Call the service function to get the count
      const totalCount = await reviewService.getAllPositiveReviewsCount();

      // 2. Send the count back in a structured JSON response
      // It's good practice to wrap primitives in an object.
      res.status(200).json({
        totalCount: totalCount,
      });

    } catch (error) {
      // 3. Pass any errors to the global error handler
      next(error);
    }
  }
);


export { router as reviewRouters };