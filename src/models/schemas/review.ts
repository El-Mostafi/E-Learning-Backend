import mongoose from "mongoose";
import { createReview } from "../../routers/review/dtos/addReview.dto";

export interface Review extends mongoose.Document {
  userName?: string;
  userImg?: string;
  course?: mongoose.Types.ObjectId;
  text: string;
  rating: number;
  createdAt: Date;
}

export interface ReviewModel extends mongoose.Model<Review> {
  build(createReview: createReview): Review;
}

const reviewSchema = new mongoose.Schema<Review>({
  userName: {
    type: String,
    required: false,
  },
  userImg: {
    type: String,
    required: false,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
  },
  text: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

reviewSchema.statics.build = (createReview: createReview) => {
  return new Review(createReview);
};

export const Review = mongoose.model<Review, ReviewModel>(
  "Review",
  reviewSchema
);

export default reviewSchema;
