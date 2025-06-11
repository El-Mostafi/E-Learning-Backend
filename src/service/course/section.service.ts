import mongoose from "mongoose";
import Course from "../../models/course";
import { SectionDto } from "src/routers/course/dtos/course.dto";

export class SectionService {
  constructor() {}

  async create(
    userId: mongoose.Types.ObjectId,
    courseId: string,
    sectionDto: SectionDto,
    userRole: string
  ) {
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, message: "Course not found" };
    }
    // Check if the user is the instructor of the course
    if (
      course.instructor.toString() !== userId.toString() &&
      userRole !== "admin"
    ) {
      return { success: false, message: "Unauthorized" };
    }

    const newSection = {
      title: sectionDto.title,
      orderIndex: sectionDto.orderIndex,
      description: sectionDto.description,
      isPreview: sectionDto.isPreview,
      lectures: [],
    };

    course.sections.push(newSection);
    await course.save();
    return {
      success: true,
      message: "Section created successfully",
      sectionId: course.sections[course.sections.length - 1].id,
    };
  }

  async findAll(courseId: string) {
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, message: "Course not found" };
    }
    return { success: true, sections: course.sections };
  }

  async findOne(courseId: string, sectionId: string) {
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, message: "Course not found" };
    }
    const section = course.sections.id(sectionId);
    if (!section) {
      return { success: false, message: "Section not found" };
    }
    return { success: true, section: section };
  }

  async update(
    userId: mongoose.Types.ObjectId,
    courseId: string,
    sectionId: string,
    sectionDto: SectionDto,
    userRole: string
  ) {
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, message: "Course not found" };
    }
    // Check if the user is the instructor of the course
    if (
      course.instructor.toString() !== userId.toString() &&
      userRole !== "admin"
    ) {
      return { success: false, message: "Unauthorized" };
    }

    const section = course.sections.id(sectionId);
    if (!section) {
      return { success: false, message: "Section not found" };
    }

    section.title = sectionDto.title;
    section.orderIndex = sectionDto.orderIndex;
    section.isPreview = sectionDto.isPreview;
    await course.save();
    return { success: true, message: "Section updated successfully" };
  }

  async delete(
    userId: mongoose.Types.ObjectId,
    courseId: string,
    sectionId: string,
    userRole: string
  ) {
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, message: "Course not found" };
    }
    // Check if the user is the instructor of the course
    if (
      course.instructor.toString() !== userId.toString() &&
      userRole !== "admin"
    ) {
      return { success: false, message: "Unauthorized" };
    }

    course.sections.pull(sectionId);
    await course.save();
    return { success: true, message: "Section deleted successfully" };
  }
}
