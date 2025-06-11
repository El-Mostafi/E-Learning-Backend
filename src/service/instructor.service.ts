// services/instructor.service.ts
import mongoose from "mongoose";
import { BadRequestError, NotFoundError } from "../../common";
import User,{  UserDocument } from "../models/user";
import Course from "../models/course";
import Enrollment from "../models/enrollment";
import { InstructorStats } from "src/routers/instructor/dtos/instructor.dtos";

export class InstructorService {
  

  async getInstructorById(userId: string): Promise<UserDocument> {
    const instructor = await User.findOne({ _id: userId, role: "instructor" , emailConfirmed: true });
    if (!instructor) throw new NotFoundError();
    return instructor;
  }

  async getAllInstructors(): Promise<UserDocument[]> {
    return await User.find({ role: "instructor", emailConfirmed: true });
  }
  async getDashboardStats(instructorId: mongoose.Types.ObjectId): Promise<InstructorStats> {
    const instructorObjectId = instructorId;

    // 1. Get all courses created by the instructor and collect their IDs
    const instructorCourses = await Course.find({ instructor: instructorObjectId })
      .select('students reviews title thumbnailPreview level category')
      .lean();

    // Handle case where instructor has no courses
    if (!instructorCourses || instructorCourses.length === 0) {
      return {
        totalStudents: 0,
        coursesCreated: 0,
        averageRating: 0,
        enrollmentsByMonth: Array(12).fill(0), // Return an empty chart array
        popularCourses: [],
      };
    }

    const courseIds = instructorCourses.map(course => course._id) as mongoose.Types.ObjectId[];

    // --- AGGREGATE STATS ---

    // 2. Calculate Total Courses Created
    const coursesCreated = instructorCourses.length;

    // 3. Calculate Total Unique Students
    // This logic remains the same and is efficient as it uses the `students` array on the course
    const studentSet = new Set<string>();
    instructorCourses.forEach(course => {
      course.students.forEach(studentId => {
        studentSet.add(studentId.toString());
      });
    });
    const totalStudents = studentSet.size;

    // 4. Calculate Average Rating across all courses
    const allReviews = instructorCourses.flatMap(course => course.reviews);
    const totalRatingSum = allReviews.reduce((sum, review) => sum + (review.rating || 0), 0);
    const averageRating = allReviews.length > 0 ? parseFloat((totalRatingSum / allReviews.length).toFixed(1)) : 0;

    // 5. Get Enrollments by Month for the current year (for the chart)
    // We now pass the array of course IDs to this function
    const enrollmentsByMonth = await this.getMonthlyEnrollments(courseIds);

    // 6. Get Popular Courses (e.g., top 3 by student count)
    const popularCourses = instructorCourses
      .map(course => {
          const courseRatingSum = course.reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
          const courseAvgRating = course.reviews.length > 0 ? parseFloat((courseRatingSum / course.reviews.length).toFixed(1)) : 0;
          return {
              id: course._id.toString(),
              title: course.title,
              thumbnail: course.thumbnailPreview,
              studentCount: course.students.length,
              rating: courseAvgRating,
              level: course.level,
              category: course.category.name
          }
      })
      .sort((a, b) => b.studentCount - a.studentCount || b.rating - a.rating)
      .slice(0, 3);
      

    return {
      totalStudents,
      coursesCreated,
      averageRating,
      enrollmentsByMonth,
      popularCourses,
    };
  }
  async getMonthlyEnrollments(courseIds: mongoose.Types.ObjectId[]): Promise<number[]> {
    const currentYear = new Date().getFullYear();
    const startDate = new Date(currentYear, 0, 1); // Jan 1st of current year
    const endDate = new Date(currentYear, 11, 31, 23, 59, 59); // Dec 31st of current year

    const monthlyData = await Enrollment.aggregate([
      {
        // Find enrollments for the instructor's courses within the current year
        $match: {
          course: { $in: courseIds }, // *** CHANGE: Use $in with course IDs
          startedAt: {                // *** CHANGE: Use 'startedAt' field
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        // Group by month
        $group: {
          _id: { $month: '$startedAt' }, // *** CHANGE: Group by 'startedAt'
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 }, // Sort by month
      },
    ]);

    // Initialize an array for 12 months with 0s
    const enrollmentsByMonth = Array(12).fill(0);

    // Fill the array with data from the aggregation result
    monthlyData.forEach(item => {
      const monthIndex = item._id - 1; // MongoDB months are 1-12, array indices are 0-11
      if (monthIndex >= 0 && monthIndex < 12) {
        enrollmentsByMonth[monthIndex] = item.count;
      }
    });

    return enrollmentsByMonth;
  }
}
export const instructorService = new InstructorService();