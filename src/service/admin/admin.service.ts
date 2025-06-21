import mongoose from "mongoose";
import User from "../../models/user";
import { CreateUserDto, updateData } from "../../routers/auth/dtos/auth.dto";
import Course from "../../models/course";
import { userService } from "../user.service";
import {
  CourseDistribution,
  DashboardData,
  DashboardStats,
  UserGrowthTrend,
  EnrollmentTrend,
  CourseLanguageStats,
  CourseLevelStats,
  CategoryPerformance,
} from "../../routers/admin/dtos/admin.dtos";
import Enrollment from "../../models/enrollment";

export class AdminService {
  constructor() {}

  async getAdminDashboardStats() {
    const [
      totalUsers,
      totalCourses,
      activeUsers,
      studentCount,
      instructorCount,
      pendingCount,
      inactiveCount,
    ] = await Promise.all([
      User.countDocuments({ role: { $in: ["student", "instructor"] } }),
      Course.countDocuments(),
      User.countDocuments({
        status: "active",
        role: { $in: ["student", "instructor"] },
      }),
      User.countDocuments({
        role: "student",
        status: "active",
        emailConfirmed: true,
      }),
      User.countDocuments({
        role: "instructor",
        status: "active",
        emailConfirmed: true,
      }),
      User.countDocuments({ emailConfirmed: false }),
      User.countDocuments({ status: "blocked" }),
    ]);

    const userDistribution = [
      {
        name: "Students",
        count: studentCount,
      },
      {
        name: "Instructors",
        count: instructorCount,
      },
      {
        name: "Pending",
        count: pendingCount,
      },
      {
        name: "Inactive",
        count: inactiveCount,
      },
    ];

    return {
      totalUsers,
      totalCourses,
      activeUsers,
      userDistribution,
    };
  }
  async getDashboardData(): Promise<DashboardData> {
    const [
      stats,
      userGrowthTrends,
      courseDistribution,
      enrollmentTrends,
      courseLanguages,
      courseLevels,
      categoryPerformance,
    ] = await Promise.all([
      this.getBasicStats(),
      this.getUserGrowthTrends(),
      this.getCourseDistribution(),
      this.getEnrollmentTrends(),
      this.getCourseLanguageStats(),
      this.getCourseLevelStats(),
      this.getCategoryPerformance(),
    ]);

    return {
      stats,
      userGrowthTrends,
      courseDistribution,
      enrollmentTrends,
      courseLanguages,
      courseLevels,
      categoryPerformance,
    };
  }

  private async getBasicStats(): Promise<DashboardStats> {
    const [
      totalUsers,
      studentsCount,
      instructorsCount,
      totalCourses,
      publishedCourses,
      totalEnrollments,
      completedEnrollments,
      averageRatingResult,
      certificatesCount,
      averageProgressResult,
      quizCompletionResult,
      activeUsersCount,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "instructor" }),
      Course.countDocuments(),
      Course.countDocuments({ isPublished: true }),
      Enrollment.countDocuments(),
      Enrollment.countDocuments({ completed: true }),
      this.getAverageRating(),
      this.getCertificatesCount(),
      this.getAverageProgress(),
      this.getQuizCompletionRate(),
      this.getActiveUsersCount(),
    ]);

    const draftCourses = totalCourses - publishedCourses;
    const inProgressEnrollments = totalEnrollments - completedEnrollments;
    const activeUsersPercentage =
      totalUsers > 0 ? (activeUsersCount / totalUsers) * 100 : 0;

    return {
      totalUsers,
      studentsCount,
      instructorsCount,
      totalCourses,
      publishedCourses,
      draftCourses,
      totalEnrollments,
      completedEnrollments,
      inProgressEnrollments,
      averageRating: averageRatingResult,
      certificatesIssued: certificatesCount,
      averageProgress: averageProgressResult,
      quizCompletionRate: quizCompletionResult,
      activeUsers: activeUsersCount,
      activeUsersPercentage,
    };
  }

  private async getAverageRating(): Promise<number> {
    const result = await Course.aggregate([
      { $unwind: "$reviews" },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$reviews.rating" },
        },
      },
    ]);

    return result.length > 0
      ? Math.round(result[0].averageRating * 10) / 10
      : 0;
  }

  private async getCertificatesCount(): Promise<number> {
    const result = await User.aggregate([
      { $project: { certificateCount: { $size: "$certificates" } } },
      { $group: { _id: null, total: { $sum: "$certificateCount" } } },
    ]);

    return result.length > 0 ? result[0].total : 0;
  }

  private async getAverageProgress(): Promise<number> {
    const result = await Enrollment.aggregate([
      {
        $group: {
          _id: null,
          averageProgress: { $avg: "$progress" },
        },
      },
    ]);

    return result.length > 0
      ? Math.round(result[0].averageProgress * 10) / 10
      : 0;
  }

  private async getQuizCompletionRate(): Promise<number> {
    const [totalEnrollments, passedQuizzes] = await Promise.all([
      Enrollment.countDocuments(),
      Enrollment.countDocuments({ hasPassedQuizze: true }),
    ]);

    return totalEnrollments > 0
      ? Math.round((passedQuizzes / totalEnrollments) * 100 * 10) / 10
      : 0;
  }

  private async getActiveUsersCount(): Promise<number> {
    

    return User.countDocuments({
      status: "active",
    });
  }

  private async getUserGrowthTrends(): Promise<UserGrowthTrend[]> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const result = await User.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            role: "$role",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthlyData: {
      [key: string]: {
        students: number;
        instructors: number;
        totalUsers: number;
      };
    } = {};

    result.forEach((item) => {
      const monthKey = `${item._id.year}-${item._id.month
        .toString()
        .padStart(2, "0")}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { students: 0, instructors: 0, totalUsers: 0 };
      }

      if (item._id.role === "student") {
        monthlyData[monthKey].students = item.count;
      } else if (item._id.role === "instructor") {
        monthlyData[monthKey].instructors = item.count;
      }

      monthlyData[monthKey].totalUsers += item.count;
    });

    return Object.entries(monthlyData).map(([month, data]) => ({
      month: this.formatMonth(month),
      ...data,
    }));
  }

  private async getCourseDistribution(): Promise<CourseDistribution[]> {
    const result = await Course.aggregate([
      { $match: { isPublished: true } },
      {
        $group: {
          _id: "$category.name",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 6 }, // Get only top 6 categories
    ]);

    const totalCourses = result.reduce((sum, item) => sum + item.count, 0);

    return result.map((item) => ({
      category: item._id || "Uncategorized",
      count: item.count,
      percentage: Math.round((item.count / totalCourses) * 100 * 10) / 10,
    }));
  }

  private async getEnrollmentTrends(): Promise<EnrollmentTrend[]> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const enrollmentResult = await Enrollment.aggregate([
      { $match: { startedAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$startedAt" },
            month: { $month: "$startedAt" },
          },
          newEnrollments: { $sum: 1 },
          completions: {
            $sum: { $cond: [{ $eq: ["$completed", true] }, 1, 0] },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    return enrollmentResult.map((item) => ({
      month: this.formatMonth(
        `${item._id.year}-${item._id.month.toString().padStart(2, "0")}`
      ),
      newEnrollments: item.newEnrollments,
      completions: item.completions,
      completionRate:
        item.newEnrollments > 0
          ? Math.round((item.completions / item.newEnrollments) * 100)
          : 0,
    }));
  }

  private async getCourseLanguageStats(): Promise<CourseLanguageStats[]> {
    const result = await Course.aggregate([
      { $match: { isPublished: true } },
      {
        $group: {
          _id: "$language",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    return result.map((item) => ({
      language: item._id,
      count: item.count,
    }));
  }

  private async getCourseLevelStats(): Promise<CourseLevelStats[]> {
    const result = await Course.aggregate([
      {
        $lookup: {
          from: "enrollments",
          localField: "_id",
          foreignField: "course",
          as: "enrollments",
        },
      },
      {
        $group: {
          _id: "$level",
          courses: { $sum: 1 },
          enrollments: { $sum: { $size: "$enrollments" } },
        },
      },
      { $sort: { courses: -1 } },
    ]);

    return result.map((item) => ({
      level: item._id,
      courses: item.courses,
      enrollments: item.enrollments,
    }));
  }

  private async getCategoryPerformance(): Promise<CategoryPerformance[]> {
    const result = await Course.aggregate([
      {
        $lookup: {
          from: "enrollments",
          localField: "_id",
          foreignField: "course",
          as: "enrollments",
        },
      },
      {
        $group: {
          _id: "$category.name",
          publishedCourses: {
            $sum: { $cond: [{ $eq: ["$isPublished", true] }, 1, 0] },
          },
          draftCourses: {
            $sum: { $cond: [{ $eq: ["$isPublished", false] }, 1, 0] },
          },
          totalEnrollments: { $sum: { $size: "$enrollments" } },
        },
      },
      { $sort: { totalEnrollments: -1 } },
    ]);

    return result.map((item) => ({
      category: item._id || "Uncategorized",
      publishedCourses: item.publishedCourses,
      draftCourses: item.draftCourses,
      totalEnrollments: item.totalEnrollments,
    }));
  }

  private formatMonth(monthStr: string): string {
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-US", {
      month: "short"
    });
  }
}

export const adminService = new AdminService();
