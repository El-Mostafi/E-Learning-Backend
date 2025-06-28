// services/student.service.ts
import mongoose from "mongoose";
import { BadRequestError, NotFoundError } from "../../common";
import User, { UserDocument } from "../models/user";
import { StudentStats } from "../routers/student/dtos/student.dtos";
import Enrollment, { EnrollmentDocument } from "../models/enrollment";
import { CourseDocument } from "src/models/course";

export class StudentService {
  async getDashboardStats(
    studentId: mongoose.Types.ObjectId
  ): Promise<StudentStats> {
    try{
      const studentObjectId = studentId;
    const student = await User.findById(studentObjectId);
    if (!student) {
      throw new BadRequestError("Student not found");
    }

    if (student.role !== "student") {
      throw new BadRequestError("User is not a student");
    }

    const studentStats: StudentStats = {
      totalTimeLearned: 0,
      coursesCompleted: 0,
      activeCourses: 0,
      certificatesIssued: 0,
      monthlyProgress: []
    };
    studentStats.certificatesIssued = student.certificates.length;


    // 1. Get all courses created by the instructor and collect their IDs
    // Get all enrollments for the student
    const enrollments = await Enrollment.find({ participant: studentObjectId })
      .populate({
        path: "course",
        populate: {
          path: "instructor",
          select: "userName",
        },
      })
      .sort({ startedAt: -1, completedAt: -1 });
    // console.log("enrollments :", enrollments);

    // Calculate total hours learned
    let totalTimeLearned = 0;
    for (const enrollment of enrollments) {
      const course = enrollment.course as any;
      if (course && course.sections) {
        for (const section of course.sections) {
          for (const lecture of section.lectures) {
            // Check if this lecture is completed
            const isLectureCompleted = enrollment.completedSections.some(
              (cs) =>
                cs.sectionId?.toString() === section._id.toString() &&
                cs.lectureId?.toString() === lecture._id.toString()
            );
            if (isLectureCompleted) {
              totalTimeLearned += lecture.duration ; 
            }
          }
        }
      }
    }

    // Count completed and active courses
    studentStats.coursesCompleted = enrollments.filter((e) => e.completed).length;
    studentStats.activeCourses = enrollments.filter((e) => !e.completed).length;
    studentStats.totalTimeLearned = totalTimeLearned;
    // Calculate monthly progress for the chart
    studentStats.monthlyProgress = this.calculateMonthlyProgress(enrollments);

    return studentStats;
    }catch(e){
      throw new BadRequestError("Something went wrong while getting student stats");
    }
  }
  private calculateMonthlyProgress(enrollments: EnrollmentDocument[]) {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const currentYear = new Date().getFullYear();
    const monthlyData: {
      [key: string]: { enrolled: number; completed: number };
    } = {};

    // Initialize all months with zero values
    months.forEach((month) => {
      monthlyData[month] = { enrolled: 0, completed: 0 };
    });

    // Process enrollments
    enrollments.forEach((enrollment) => {
      const enrolledDate = new Date(enrollment.startedAt);
      const completedDate = enrollment.completedAt
        ? new Date(enrollment.completedAt)
        : null;

      // Only count enrollments from current year
      if (enrolledDate.getFullYear() === currentYear) {
        const enrolledMonth = months[enrolledDate.getMonth()];
        monthlyData[enrolledMonth].enrolled += 1;
      }

      // Count completions
      if (completedDate && completedDate.getFullYear() === currentYear) {
        const completedMonth = months[completedDate.getMonth()];
        monthlyData[completedMonth].completed += 1;
      }
    });

    // Convert to array format expected by frontend
    return months.map((month) => ({
      coursesEnrolled: monthlyData[month].enrolled,
      coursesCompleted: monthlyData[month].completed,
    }));
  }
  async getStudentById(userId: string): Promise<UserDocument> {
    const student = await User.findOne({ _id: userId, role: "student" });
    if (!student) throw new NotFoundError();
    return student;
  }

  async getAllStudents(): Promise<UserDocument[]> {
    return await User.find({ role: "student" });
  }
}
