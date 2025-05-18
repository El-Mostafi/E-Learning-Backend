import mongoose from "mongoose";
import { Category } from "../../src/models/schemas/category";
import { Review } from "../../src/models/schemas/review";

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
  description: string;
  sections: SectionData[];
  certifications: number;
  progress?: number;
  completed?: boolean;
  completedAt?: Date | null;
  startedAt?: Date;
  isUserEnrolled: boolean;
}
