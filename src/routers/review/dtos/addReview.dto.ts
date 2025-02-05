import mongoose from "mongoose";

export interface AddReviewDto {
  course?: mongoose.Types.ObjectId;
  rating: number;
  text: string;
}

export interface createReview {
  userName?: string;
  userImg?: string;
  course?: mongoose.Types.ObjectId;
  text: string;
  rating: number;
  createdAt: Date;
}
