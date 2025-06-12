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
export interface GetAllCoursesOptions {
  page: number;
  limit: number;
  search?: string;
  status?: "published" | "draft";
  category?: string;
  level?: string;
  language?: string;
}

// This will be the structure of each course object returned by the service
export interface AugmentedCourse {
  id: string;
  title: string;
  numberOfSections: number;
  category: string;
  instructor: string;
  numberOfStudents: number;
  averageRating: number;
  revenue: number;
  status: "Published" | "Draft";
  createdAt: Date;
}
export type InstructorCoursesSortOption = "newest" | "title" | "popularity" | "rating";

export interface FindAllInstructorCoursesOptions {
  page: number;
  limit: number;
  search?: string;
  sort: InstructorCoursesSortOption;
}

export interface CreateCouponDto {
  courseId: string;
  code: string;
  discountPercentage: number;
  maxUses: number;
  expiryDate: Date;
}

export interface UpdateCouponDto {
  code?: string;
  discountPercentage?: number;
  maxUses?: number;
  expiryDate?: Date;
}