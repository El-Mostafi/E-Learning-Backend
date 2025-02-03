import Course from "../../models/course";
import { LectureDto } from "src/routers/course/dtos/course.dto";

export class LectureService {
  constructor() {}

  async create(courseId: string, sectionId: string, lectureDto: LectureDto) {
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, message: "Course not found" };
    }

    const section = course.sections.id(sectionId);
    if (!section) {
      return { success: false, message: "Section not found" };
    }

    const newLecture = {
      title: lectureDto.title,
      duration: lectureDto.duration,
      videoUrl: lectureDto.videoUrl,
      thumbnailUrl: lectureDto.thumbnailUrl,
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
    return section.lectures;
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
    return lecture;
  }

  async update(
    courseId: string,
    sectionId: string,
    lectureId: string,
    lectureDto: LectureDto
  ) {
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

    lecture.title = lectureDto.title;
    lecture.duration = lectureDto.duration;
    lecture.videoUrl = lectureDto.videoUrl;
    lecture.thumbnailUrl = lectureDto.thumbnailUrl;

    await course.save();
    return { success: true, message: "Lecture updated successfully" };
  }

  async delete(courseId: string, sectionId: string, lectureId: string) {
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, message: "Course not found" };
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
