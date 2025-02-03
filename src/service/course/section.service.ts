import Course from "../../models/course";
import { SectionDto } from "src/routers/course/dtos/course.dto";

export class SectionService {
  constructor() {}

  async create(courseId: string, sectionDto: SectionDto) {
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, message: "Course not found" };
    }

    const newSection = {
      title: sectionDto.title,
      orderIndex: sectionDto.orderIndex,
      isPreview: sectionDto.isPreview,
      lectures: [],
    };

    course.sections.push(newSection);
    await course.save();
    return { success: true, message: "Section created successfully" };
  }

  async findAll(courseId: string) {
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, message: "Course not found" };
    }
    return course.sections;
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
    return section;
  }

  async update(courseId: string, sectionId: string, sectionDto: SectionDto) {
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, message: "Course not found" };
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

  async delete(courseId: string, sectionId: string) {
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, message: "Course not found" };
    }
    course.sections.pull(sectionId);
    await course.save();
    return { success: true, message: "Section deleted successfully" };
  }
}
