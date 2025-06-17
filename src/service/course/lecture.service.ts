import mongoose from "mongoose";
import Course from "../../models/course";
import { LectureDto } from "../../routers/course/dtos/course.dto";

export class LectureService {
  constructor() {}

  async create(
    userId: mongoose.Types.ObjectId,
    courseId: string,
    sectionId: string,
    lectureDto: LectureDto,
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

    const section = course.sections.id(sectionId);
    if (!section) {
      return { success: false, message: "Section not found" };
    }

    const newLecture = {
      title: lectureDto.title,
      duration: lectureDto.duration,
      videoUrl: lectureDto.videoUrl,
      description: lectureDto.description,
      publicId: lectureDto.publicId,
      isPreview: lectureDto.isPreview,
    };

    section.lectures.push(newLecture);
    await course.save();
    return { success: true, message: "Lecture created successfully" };
  }

  async findAll(courseId: string, sectionId: string) {
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, message: "Course not found" };
    }
    const section = course.sections.id(sectionId);
    if (!section) {
      return { success: false, message: "Section not found" };
    }
    return { success: true, lectures: section.lectures };
  }

  async findOne(courseId: string, sectionId: string, lectureId: string) {
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, message: "Course not found" };
    }
    const section = course.sections.id(sectionId);
    if (!section) {
      return { success: false, message: "Section not found" };
    }
    const lecture = section.lectures.id(lectureId);
    if (!lecture) {
      return { success: false, message: "Lecture not found" };
    }
    return { success: true, lecture: lecture };
  }

  async update(
    userId: mongoose.Types.ObjectId,
    courseId: string,
    sectionId: string,
    lectureId: string,
    lectureDto: LectureDto,
    userRole: string
  ) {
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, message: "Course not found" };
    }

    const section = course.sections.id(sectionId);
    if (!section) {
      return { success: false, message: "Section not found" };
    }

    // Check if the user is the instructor of the course
    if (course.instructor.toString() !== userId.toString() && userRole !== "admin") {
      return { success: false, message: "Unauthorized" };
    }

    const lecture = section.lectures.id(lectureId);
    if (!lecture) {
      return { success: false, message: "Lecture not found" };
    }

    lecture.title = lectureDto.title;
    lecture.duration = lectureDto.duration;
    lecture.videoUrl = lectureDto.videoUrl;
    lecture.description = lectureDto.description;
    lecture.publicId = lectureDto.publicId;
    lecture.isPreview = lectureDto.isPreview;

    await course.save();
    return { success: true, message: "Lecture updated successfully" };
  }

  async delete(
    userId: mongoose.Types.ObjectId,
    courseId: string,
    sectionId: string,
    lectureId: string,
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

    const section = course.sections.id(sectionId);
    if (!section) {
      return { success: false, message: "Section not found" };
    }
    section.lectures.pull(lectureId);
    await course.save();
    return { success: true, message: "Lecture deleted successfully" };
  }
}
