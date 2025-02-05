import mongoose from "mongoose";
import {
  AddReviewDto,
  createReview,
} from "../../routers/review/dtos/addReview.dto";
import Course from "../../models/course";
import User from "../../models/user";
import Enrollment from "../../models/enrollment";
import { Review } from "../../models/schemas/review";

export class ReviewService {
  constructor() {}
  async create(userId: mongoose.Types.ObjectId, addReviewDto: AddReviewDto) {
    const courseId = addReviewDto.course!;
    const rating = addReviewDto.rating;
    const text = addReviewDto.text;

    // Check if the user exists
    const participant = await User.findById(userId);
    if (!participant) {
      return { success: false, message: "User not found" };
    }

    const course = await Course.findById(courseId);
    // Check if the course exists
    if (!course) {
      return { success: false, message: "Course not Found" };
    }

    // Check if the user is enrolled in the course
    const enrollment = await Enrollment.findOne({
      course: courseId,
      participant: userId,
    });
    if (!enrollment) {
      return { success: false, message: "User not enrolled in the course" };
    }

    // Check if the participant has already rated the course
    const existingReview = participant.reviews.find((review) =>
      review.course?.equals(courseId)
    );
    if (existingReview) {
      // Update the review in participant reviews
      existingReview.rating = rating;
      existingReview.text = text;
      existingReview.createdAt = new Date();
      // Update the review in course reviews
      const courseReview = course.reviews.find(
        (review) => review.userName === participant.userName
      );

      if (courseReview) {
        courseReview.rating = rating;
        courseReview.text = text;
        courseReview.createdAt = new Date();
      }
    } else {
      // Create the review
      let review: createReview = {
        userName: participant.userName,
        userImg: participant.profileImg,
        text: text,
        rating: rating,
        createdAt: new Date(),
      };
      const courseReview = Review.build(review);
      //Add the review to the course
      course.reviews.push(courseReview);

      // Add the review to the participant reviews
      review = {
        course: courseId,
        text: text,
        rating: rating,
        createdAt: new Date(),
      };

      const participantReview = Review.build(review);
      participant.reviews.push(participantReview);
    }
    await course.save();
    await participant.save();

    return { success: true, message: "Review added successfully" };
  }

  async updateReview(
    userId: mongoose.Types.ObjectId,
    reviewId: string,
    addReviewDto: AddReviewDto
  ) {
    const courseId = addReviewDto.course!;
    const rating = addReviewDto.rating;
    const text = addReviewDto.text;

    // Check if the user exists
    const participant = await User.findById(userId);
    if (!participant) {
      return { success: false, message: "User not found" };
    }

    const course = await Course.findById(courseId);
    // Check if the course exists
    if (!course) {
      return { success: false, message: "Course not Found" };
    }

    // Check if the user is enrolled in the course
    const enrollment = await Enrollment.findOne({
      course: courseId,
      participant: userId,
    });
    if (!enrollment) {
      return { success: false, message: "User not enrolled in the course" };
    }

    // Check if the participant has already rated the course
    const existingReview = participant.reviews.find((review: any) =>
      review._id.equals(reviewId)
    );

    if (existingReview) {
      // Update the review in participant reviews
      existingReview.rating = rating;
      existingReview.text = text;
      existingReview.createdAt = new Date();
      // Update the review in course reviews
      const courseReview = course.reviews.find((review: any) =>
        review._id.equals(reviewId)
      );
      if (courseReview) {
        courseReview.rating = rating;
        courseReview.text = text;
        courseReview.createdAt = new Date();
      }
      await course.save();
      await participant.save();
      return { success: true, message: "Review updated successfully" };
    } else {
      return { success: false, message: "Review not Found!" };
    }
  }

  // User reviews
  async findUserReviews(userId: mongoose.Types.ObjectId) {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: "User not found" };
    }
    return { success: true, reviews: user.reviews };
  }

  async findOneUserReviewById(
    userId: mongoose.Types.ObjectId,
    courseId: mongoose.Types.ObjectId
  ) {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: "User not found" };
    }
    const review = user.reviews.find((review: Review) =>
      review.course?.equals(courseId)
    );
    if (!review) {
      return { success: false, message: "Review not found" };
    }
    return { success: true, review: review };
  }

  // Course reviews

  async findCourseReviews(courseId: mongoose.Types.ObjectId) {
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, message: "Course not found" };
    }
    return { success: true, reviews: course.reviews };
  }


  async removeReview(userId: mongoose.Types.ObjectId, reviewId: string) {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: "User not found" };
    }

    const review = user.reviews.find(
      (review: any) => review._id.toString() === reviewId
    );

    if (!review) {
      return { success: false, message: "Review not found" };
    }

    const courseId = review.course!;
    const course = await Course.findById(courseId);

    if (!course) {
      return { success: false, message: "Course not found" };
    }

    // Remove the review from the user's reviews array
    user.reviews = user.reviews.pull(reviewId);
    await user.save();

    // Remove the review from the course's reviews array
    course.reviews.pull(reviewId);
    await course.save();

    return { success: true, message: "Review removed successfully" };
  }
}
