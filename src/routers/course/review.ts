import mongoose from "mongoose";

export interface Review extends mongoose.Document {
    userId: string;
    userName: string;
    text: string;
    rating: number;
    createdAt: Date;
}

const reviewSchema = new mongoose.Schema({
  userId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  userName: {
    type: String,
    required: true,
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

export default reviewSchema;