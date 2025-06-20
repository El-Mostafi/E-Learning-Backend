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
      } else {
        let review: createReview = {
          userName: participant.userName,
          userImg: participant.profileImg,
          text: text,
          rating: rating,
          createdAt: new Date(),
        };
        const courseReview = Review.build(review);
        course.reviews.push(courseReview);
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

  async getTopReviews(limit: number = 5): Promise<any[]> {
    const topReviews = await Course.aggregate([
      // Stage 1: Filter for published courses that have at least one review.
      // This check prevents an unnecessary $unwind on courses with no reviews.
      { $match: { isPublished: true, "reviews.0": { $exists: true } } },

      // Stage 2: Deconstruct the reviews array to process each review individually.
      { $unwind: "$reviews" },

      // Stage 3: Filter for high-rated reviews. Using $gte is more flexible.
      // You can set this to 5 if you only want perfect scores.
      { $match: { "reviews.rating": { $gte: 4 } } },

      // Stage 4: Sort by the review's creation date to get the newest ones first.
      { $sort: { "reviews.createdAt": -1 } },

      // Stage 5: Limit to the desired number of results.
      { $limit: limit },

      // Stage 6: Project the final, clean shape for the frontend.
      // We can now pull all data directly from the unwound document.
      {
        $project: {
          // Use the review's _id for the 'key' in a React list, for example.
          _id: "$reviews._id",
          text: "$reviews.text", // Correct field name
          rating: "$reviews.rating",
          createdAt: "$reviews.createdAt",

          // Create a nested 'user' object directly from the review's stored data.
          user: {
            name: "$reviews.userName", // Correct field name
            image: "$reviews.userImg", // Correct field name
          },

          // Include course context.
          course: {
            _id: "$_id", // The original course _id
            title: "$title",
          },
        },
      },
    ]);

    return topReviews;
  }

  async getAllPositiveReviewsCount(): Promise<number> {
    const result = await Course.aggregate([
      // Stage 1: Deconstruct the reviews array
      {
        $unwind: "$reviews",
      },
      // Stage 2: Count the resulting documents
      {
        $match: { "reviews.rating": { $gte: 4 } },
      },
      {
        $count: "totalReviews",
      },
    ]);

    // The result is an array, e.g., [{ totalReviews: 8500 }]
    // If there are no reviews, the result will be an empty array [].
    if (result.length > 0) {
      return result[0].totalReviews;
    }

    return 0;
  }
}
