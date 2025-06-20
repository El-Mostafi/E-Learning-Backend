export interface StudentStats {
  totalTimeLearned: number;
  coursesCompleted: number;
  activeCourses: number;
  certificatesIssued: number;
  monthlyProgress: {
    coursesEnrolled: number;
    coursesCompleted: number;
  }[];
}