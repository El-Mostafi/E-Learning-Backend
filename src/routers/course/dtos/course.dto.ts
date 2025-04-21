import mongoose from "mongoose";

export interface LectureDto {
  title: string;
  duration: number;
  videoUrl: string;
  description: string;
  publicId: string;
  isPreview: boolean;
}

export interface SectionDto {
  title: string;
  description: string;
  orderIndex: number;
  isPreview: boolean;
  lectures?: LectureDto[];
}

export interface ExamDto {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: "A" | "B" | "C" | "D";
}

export interface CategoryDto {
  name: string;
}
export interface Coupons {
  code: string;
  discountPercentage: number;
  maxUses: number;
  expiryDate: Date;
}

export interface CourseDto {
  title: string;
  description: string;
  thumbnailPreview: string;
  imgPublicId: string;
  level: string;
  language: string;
  pricing: {
    price: number;
    isFree: boolean;
  };
  oldPrice: number;
  category: CategoryDto;
  isPublished?: boolean;
}
export interface CourseDtoWithCoupons extends CourseDto {
  coupons: Coupons[];
}
