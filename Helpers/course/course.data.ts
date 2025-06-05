import mongoose from "mongoose";
import { Category } from "../../src/models/schemas/category";
import { Review } from "../../src/models/schemas/review";
import SectionDataV from "./section.data";

interface SectionData {
  id: string;
  title: string;
  description: string;
  orderIndex: number;
  isPreview: boolean;
  lectures: {
    id: string;
    title: string;
    description: string;
    duration: number;
    isPreview: boolean;
    videoUrl: string | "";
    publicId?: string;
  }[];
}

export interface courseInstructor {
  id: string;
  title: string;
  thumbnailPreview: string;
  category: string;
  level: string;
  language: string;
  reviews: number;
  students: number;
  instructorName?: string;
  instructorImg?: string;
  createdAt: Date;
}
export interface courseDataGenerale extends courseInstructor {
  description: string;
  price: number;
  duration: number;
  InstructorId: string;
}
export interface courseStudent extends courseInstructor{
  completedSections: number;
  lectureTotal: number; 
  description: string;
  price: number;
  duration: number;
  progress: number;
  completed: boolean;
  completedAt: Date | null;
  startedAt: Date;
}
export interface courseDataDetails extends courseDataGenerale {
  reviewsLenght: number;
  ratingsCount: number[];
  instructorExpertise?: string;
  instructorBiography?: string;
  feedbacks: {
    rating: number;
    comment: string;
    userName?: string;
    userImg?: string;
    createdAt: Date;
  }[];
}

export interface courseData extends courseDataDetails {
  imgPublicId?: string;
  description: string;
  sections: SectionData[];
  certifications: number;
  progress?: number;
  completed?: boolean;
  completedAt?: Date | null;
  startedAt?: Date;
  isUserEnrolled: boolean;
  appliedCoupon?: { code: string; discountPercentage: number }
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
  correctAnswer: "A" | "B" | "C" | "D";
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
  sections: SectionDataV[];
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
