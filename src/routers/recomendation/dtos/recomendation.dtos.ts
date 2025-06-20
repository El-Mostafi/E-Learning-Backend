import { Types } from "mongoose";
import { CourseDocument } from "../../../models/course";

// export interface TrainingOptions {
//   numFeatures?: number;
//   learningRate?: number;
//   iterations?: number;
//   lambda?: number;
//   logInterval?: number;
// }

// export interface ModelData {
//   X: number[];
//   W: number[];
//   b: number[];
//   Ymean: number[];
//   XShape: number[];
//   WShape: number[];
//   bShape: number[];
//   YmeanShape: number[];
//   userToIdx: [string, number][];
//   courseToIdx: [string, number][];
//   idxToUser: [number,string][];
//   idxToCourse: [number, string][];
// }
export interface UserType {
  _id: Types.ObjectId;
  userName: string;
  fieldOfStudy?: string;
  educationLevel?: 'high_school' | 'associate' | 'bachelor' | 'master' | 'doctorate';
  reviews: {
    rating: number
    course: Types.ObjectId
  }[];
}

export interface Category {
  name: string;
}

export interface Review {

  rating: number;
}

export interface Lecture {
  title: string;
}

export interface Section {
  lectures: Lecture[];
}

export interface Pricing {
  isFree: boolean;
  price?: number;
}

export interface CourseType {
  _id: Types.ObjectId;
  title: string;
  category?: Category;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';
  language: string;
  pricing: Pricing;
  reviews: Review[];
  sections: Section[];
  isPublished: boolean;
}

export interface   EnrollmentType {
  _id: Types.ObjectId;
  participant: Types.ObjectId;
  course: Types.ObjectId;
  progress: number;
  completed: boolean;
  hasPassedQuizze: boolean;
  QuizzeScore: number;
  startedAt: Date;
  completedAt?: Date;
  user?: UserType;
  course_data?: CourseType;
}

export interface CourseFeature {
  [key: string]: number;
  price: number;
  isFree: number;
  avgRating: number;
  numReviews: number;
  numSections: number;
  totalLectures: number;
}

export interface UserProfile {
  [key: string]: number;
}

export interface Prediction {
  course: CourseDocument;
  predictedRating: number;
}

export interface SimilarUser {
  userId: string;
  similarity: number;
}

export interface SimilarCourse {
  courseId: string;
  similarity: number;
}

export interface LoadDataResult {
  enrollments:   EnrollmentType[];
  users: UserType[];
  courses: CourseDocument[];
}

export interface ModelData {
  userItemMatrix: number[][];
  userFeatures: number[][];
  itemFeatures: number[][];
  userSimilarity: number[][];
  itemSimilarity: number[][];
  userToIdx: [string, number][];
  courseToIdx: [string, number][];
  idxToUser: [number, string][];
  idxToCourse: [number, string][];
  userProfiles: [string, UserProfile][];
  usersRecommendations: [string, string[]][];
  matrixShape: {
    userItemRows: number;
    userItemCols: number;
    userFeaturesRows: number;
    userFeaturesCols: number;
    itemFeaturesRows: number;
    itemFeaturesCols: number;
  };
}
// Enhanced interfaces for training management
export interface ModelMetadata {
  lastTrainedAt: Date;
  version: string;
  trainingDataStats: {
    totalUsers: number;
    totalCourses: number;
    totalEnrollments: number;
  };
  modelMetrics: {
    matrixDensity: number;
    factorizationDimensions: number;
  };
}

export interface TrainingStatus {
  needsRetraining: boolean;
  lastTrainedAt: Date | null;
  daysSinceLastTraining: number;
  newUsersCount: number;
  newCoursesCount: number;
  newEnrollmentsCount: number;
  recommendedAction: 'train' | 'retrain' | 'up_to_date';
  trainingUrgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface EnhancedModelData extends ModelData {
  metadata: ModelMetadata;
}