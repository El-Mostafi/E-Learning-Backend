import mongoose from "mongoose";
import Course from "../../models/course";
import { ExamDto } from "src/routers/course/dtos/course.dto";

export class ExamService {
  constructor() {}

  async create(
    userId: mongoose.Types.ObjectId,
    courseId: string,
    examDto: ExamDto,
    userRole: string
  ) {
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, message: "Course not found" };
    }
    // Check if the user is the instructor of the course
    if (course.instructor.toString() !== userId.toString() && userRole !== "admin") {
      return { success: false, message: "Unauthorized" };
    }

    const newExam = {
      question: examDto.question,
      options: {
        A: examDto.options.A,
        B: examDto.options.B,
        C: examDto.options.C,
        D: examDto.options.D,
      },
      correctAnswer: examDto.correctAnswer,
    };

    course.quizQuestions.push(newExam);
    await course.save();
    return { success: true, message: "Exam created successfully"};
  }

  async findAll(courseId: string) {
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, message: "Course not found" };
    }
    return { success: true, exams: course.quizQuestions };
  }

  async findOne(courseId: string, examId: string) {
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, message: "Course not found" };
    }
    const exam = course.quizQuestions.id(examId);
    if (!exam) {
      return { success: false, message: "Exam not found" };
    }
    return { success: true, exam: exam };
  }

  async update(
    userId: mongoose.Types.ObjectId,
    courseId: string,
    examId: string,
    examDto: ExamDto,
    userRole: string
  ) {
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, message: "Course not found" };
    }
    // Check if the user is the instructor of the course
    if (course.instructor.toString() !== userId.toString(), userRole !== "admin") {
      return { success: false, message: "Unauthorized" };
    }

    const exam = course.quizQuestions.id(examId);
    if (!exam) {
      return { success: false, message: "Exam not found" };
    }

    exam.question=examDto.question;
    exam.options= {
      A: examDto.options.A,
      B: examDto.options.B,
      C: examDto.options.C,
      D: examDto.options.D,
    },
    exam.correctAnswer= examDto.correctAnswer,

    await course.save();
    return { success: true, message: "Exam updated successfully" };
  }

  async delete(
    userId: mongoose.Types.ObjectId,
    courseId: string,
    examId: string,
    userRole: string
  ) {
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, message: "Course not found" };
    }
    // Check if the user is the instructor of the course
    if (course.instructor.toString() !== userId.toString(), userRole !== "admin") {
      return { success: false, message: "Unauthorized" };
    }

    course.quizQuestions.pull(examId);
    await course.save();
    return { success: true, message: "Exam deleted successfully" };
  }
}
