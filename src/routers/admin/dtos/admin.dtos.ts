export interface DashboardStats {
  totalUsers: number;
  studentsCount: number;
  instructorsCount: number;
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  totalEnrollments: number;
  completedEnrollments: number;
  inProgressEnrollments: number;
  averageRating: number;
  certificatesIssued: number;
  averageProgress: number;
  quizCompletionRate: number;
  activeUsers: number;
  activeUsersPercentage: number;
}

export interface UserGrowthTrend {
  month: string;
  students: number;
  instructors: number;
  totalUsers: number;
}

export interface CourseDistribution {
  category: string;
  count: number;
  percentage: number;
}

export interface EnrollmentTrend {
  month: string;
  newEnrollments: number;
  completions: number;
  completionRate: number;
}

export interface CourseLanguageStats {
  language: string;
  count: number;
}

export interface CourseLevelStats {
  level: string;
  courses: number;
  enrollments: number;
}

export interface CategoryPerformance {
  category: string;
  publishedCourses: number;
  draftCourses: number;
  totalEnrollments: number;
}

export interface DashboardData {
  stats: DashboardStats;
  userGrowthTrends: UserGrowthTrend[];
  courseDistribution: CourseDistribution[];
  enrollmentTrends: EnrollmentTrend[];
  courseLanguages: CourseLanguageStats[];
  courseLevels: CourseLevelStats[];
  categoryPerformance: CategoryPerformance[];
}