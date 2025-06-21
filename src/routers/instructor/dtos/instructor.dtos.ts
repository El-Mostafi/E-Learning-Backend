export interface InstructorStats {
  totalStudents: number;
  coursesCreated: number;
  averageRating: number;
  enrollmentsByMonth: number[];
  popularCourses: {
    id: string;
    title: string;
    thumbnail: string;
    studentCount: number;
    rating: number;
    level: string;
    category: string;
  }[];
}


export interface InstructorSummary {
  totalStudents: number;
  coursesCreated: number;
  averageRating: number;
  popularCourses: {
    id: string;
    title: string;
    thumbnail: string;
    studentCount: number;
    rating: number;
    level: string;
    category: string;
  }[];
}