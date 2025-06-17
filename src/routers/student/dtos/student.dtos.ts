export interface StudentStats {
  totalTimeLearned: number;
  coursesCompleted: number;
  activeCourses: number;
  monthlyProgress: {
    coursesEnrolled: number;
    coursesCompleted: number;
  }[];
}