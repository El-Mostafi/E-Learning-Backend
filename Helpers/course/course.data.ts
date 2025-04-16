import mongoose from "mongoose";
import { Category } from "../../src/models/schemas/category";
import { Review } from "../../src/models/schemas/review";
import SectionData from "./section.data";

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

export default courseData;
