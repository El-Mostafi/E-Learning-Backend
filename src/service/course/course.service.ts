import mongoose from "mongoose";
import Course from "../../models/course";
import { CourseDto } from "../../routers/course/dtos/course.dto";
import courseData from "../../../Helpers/course/course.data";

export class CourseService {
  constructor() {}

  async create(courseDto: CourseDto, instructorId: mongoose.Types.ObjectId) {
    const course = Course.build(courseDto);
    course.instructor = instructorId;
    await course.save();
    return { success: true, message: "Course created successfully!" };
  }

  async findAll() {
    const courses = await Course.find().populate("instructor", [
      "userName",
      "profileImg",
      "AboutMe",
      "speciality",
    ]);

    if (!courses) {
      return { success: false, message: "No courses found" };
    }

    return { success: true, courses: courses.map(this.transformCourse) };
  }

  async findOneById(id: string) {
    const course = await Course.findById(id).populate("instructor", [
      "userName",
      "profileImg",
      "AboutMe",
      "speciality",
    ]);

    if (!course) {
      return { success: false, message: "Course not Found" };
    }

    return { success: true, course: this.transformCourse(course) };
  }

  async findPublishedCourses() {
    const courses = await Course.find({ isPublished: true }).populate(
      "instructor",
      ["userName", "profileImg", "AboutMe", "speciality"]
    );
    if (!courses) {
      return { success: false, message: "No published courses found" };
    }

    return { success: true, courses: courses.map(this.transformCourse) };
  }

  async findAllByInstructorId(instructorId: mongoose.Types.ObjectId) {
    const courses = await Course.find({ instructor: instructorId }).populate(
      "instructor",
      ["userName", "profileImg", "AboutMe", "speciality"]
    );
    if (!courses) {
      return { success: false, message: "No courses found" };
    }
    return { success: true, courses: courses.map(this.transformCourse) };
  }

  async findAllByCategoryId(categoryId: string) {
    const courses = await Course.find({ "category._id": categoryId }).populate(
      "instructor",
      ["userName", "profileImg", "AboutMe", "speciality"]
    );

    if (!courses) {
      return { success: false, message: "No courses found" };
    }
    return { success: true, courses: courses.map(this.transformCourse) };
  }

  async updateOneById(
    userId: mongoose.Types.ObjectId,
    courseId: string,
    courseDto: CourseDto
  ) {
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, message: "Course not found" };
    }
    if (course.instructor.toString() !== userId.toString()) {
      return { success: false, message: "Permission denied!" };
    }
    const updatedCourse = await Course.findByIdAndUpdate(courseId, courseDto, {
      new: true,
    });
    if (!updatedCourse) {
      return {
        success: false,
        message: "Error while trying to update the course",
      };
    }
    return { success: true, message: "Course updated successfully!" };
  }

  async deleteOneById(userId: mongoose.Types.ObjectId, courseId: string) {
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, message: "Course not found!" };
    }
    if (course.instructor.toString() !== userId.toString()) {
      return { success: false, message: "Permission denied!" };
    }
    const deletedCourse = await Course.findByIdAndDelete(courseId);
    if (!deletedCourse) {
      return {
        success: false,
        message: "Error while trying to delete the course",
      };
    }
    return { success: true, message: "Course deleted successfully" };
  }

  async publishOneById(userId: mongoose.Types.ObjectId, courseId: string) {
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, message: "Course not found!" };
    }
    if (course.instructor.toString() !== userId.toString()) {
      return { success: false, message: "Permission denied!" };
    }
    const publishedCourse = await Course.findByIdAndUpdate(
      courseId,
      { isPublished: true },
      { new: true }
    );
    if (!publishedCourse) {
      return {
        success: false,
        message: "Error while trying to publish the course",
      };
    }
    return { success: true, message: "Course published successfully" };
  }

  async unpublishOneById(userId: mongoose.Types.ObjectId, courseId: string) {
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, message: "Course not found" };
    }
    if (course.instructor.toString() !== userId.toString()) {
      return { success: false, message: "Permission denied!" };
    }
    const unpublishedCourse = await Course.findByIdAndUpdate(
      courseId,
      { isPublished: false },
      { new: true }
    );
    if (!unpublishedCourse) {
      return {
        success: false,
        message: "Error while trying to unpublish the course",
      };
    }
    return { success: true, message: "Course unpublished successfully" };
  }

  private transformCourse(course: any): courseData {
    return {
      id: course._id.toString(),
      title: course.title,
      description: course.description,
      coverImg: course.coverImg,
      level: course.level,
      language: course.language,
      price: course.price,
      oldPrice: course.oldPrice,
      category: course.category,
      reviews: course.reviews,
      sections: course.sections.map((section: any) => ({
        id: section._id.toString(),
        title: section.title,
        lectures: section.lectures.map((lecture: any) => lecture.title),
      })),
      certifications: course.certificates.length,
      students: course.students.length,
      instructorName: course.instructor.userName,
      instructorImg: course.instructor.profileImg,
    };
  }
}

export const courseService = new CourseService();
