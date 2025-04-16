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
  options: string[];
  correctAnswerIndex: string;
}

export interface CategoryDto {
  name: string;
}


export interface CoursDtoParent {
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
export interface CourseDto extends CoursDtoParent {
  quizQuestions: ExamDto[];
}


