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