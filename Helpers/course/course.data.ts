import mongoose from "mongoose";
import { Category } from "../../src/models/schemas/category";
import { Review } from "../../src/models/schemas/review";
import SectionData from "./section.data";
import { SectionDto } from "src/routers/course/dtos/course.dto";

interface courseData {
  id: string;
  title: string;
  description: string;
  coverImg: string;
  level: string;
  language: string;
  price: number;
  oldPrice?: number;
  category: Category;
  reviews: mongoose.Types.DocumentArray<Review>;
  sections: SectionData[];
  certifications: number;
  students: number;
  instructorName: string;
  instructorImg: string;
}
export interface courseInstructor {
  id: string;
  title: string;
  thumbnailPreview: string;
  category: string;
  level: string;
  reviews: number;
  students: number;
  instructorName: string;
  instructorImg: string;
  createdAt: Date;
}
export interface courseDataGenerale extends courseInstructor {
  description: string;
  price: number;
  duration: number;
  InstructorId: string;
}
export interface courseDataDetails extends courseDataGenerale {
  reviewsLenght: number;
  ratingsCount: number[];
  sections: SectionData[];
  instructorExpertise: string;
  instructorBaiography: string;
  feedbacks: {
    rating: number;
    comment: string;
    userName?: string;
    userImg?: string;
    createdAt: Date;
  }[];
}

interface QuizQuestion {
  id: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D' ;
}
interface Coupon {
  code: string;
  discountPercentage: number;
  maxUses: number;
  expiryDate: Date;
}

export interface courseToEdit {
  id: string;
  title: string;
  description: string;
  thumbnailPreview: string;
  imgPublicId: string;
  level: string;
  language: string;
  sections: SectionData[];
  quizQuestions: QuizQuestion[];
  pricing: {
    price: number;
    isFree: boolean;
  };
  oldPrice?: number;
  category: {
    name: string;
  };
  coupons?: Coupon[];
}
export default courseData;
