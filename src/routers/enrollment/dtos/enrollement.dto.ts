import mongoose from "mongoose";
export interface completedSection {
  sectionId: mongoose.Types.ObjectId;
  lectureId: mongoose.Types.ObjectId;
  completedAt: Date;
}

export interface EnrollmentInterface {
  course: mongoose.Types.ObjectId;
  participant: mongoose.Types.ObjectId;
  completedSections: completedSection[];
  progress: number;
  completed: boolean;
  completedAt: Date | null;
  startedAt: Date;
}
export type EnrolledCoursesSortOption = "newest" | "title" | "progress" | "rating";

export interface FindAllEnrollmentsOptions {
  page: number;
  limit: number;
  search?: string;
  sort: EnrolledCoursesSortOption;
}
export interface courseStudentTable {
  id: string;
  title: string;
  thumbnailPreview: string;
  progress: number;
  completed: boolean;
}