import mongoose from "mongoose";
import Course, { CourseDocument, Section, Lecture } from "../../models/course";
import { CourseDto, CourseDtoWithCoupons } from "../../routers/course/dtos/course.dto";
import courseData, {
  courseDataGenerale,
  courseInstructor,
  courseDataDetails,
} from "../../../Helpers/course/course.data";
import { Types } from "mongoose";

export class CourseService {
  constructor() {}

  async create(courseDto: CourseDtoWithCoupons, instructorId: mongoose.Types.ObjectId) {
    const { coupons, ...courseData } = courseDto;
    const course = Course.build(courseData);
    course.instructor = instructorId;
    course.coupons = new Types.DocumentArray(coupons);
    await course.save();
    return {
      success: true,
      message: "Course created successfully!",
      courseId: course.id,
    };
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
      "id",
      "userName",
      "profileImg",
      "expertise",
      "biography",
    ]);

    if (!course) {
      return { success: false, message: "Course not Found" };
    }

    return { success: true, course: this.transformCourseDetails(course) };
  }

  async findPublishedCourses() {
    const courses = await Course.find({ isPublished: true }).populate(
      "instructor",
      ["id","userName", "profileImg", "AboutMe", "speciality"]
    );
    if (!courses) {
      return { success: false, message: "No published courses found" };
    }

    return { success: true, courses: courses.map(course => this.transformCourseGenerale(course)) };
  }

  async findAllByInstructorId(instructorId: mongoose.Types.ObjectId) {
    const courses = await Course.find({ instructor: instructorId }).populate(
      "instructor",
      ["userName", "profileImg", "AboutMe", "speciality"]
    );
    if (!courses) {
      return { success: false, message: "No courses found" };
    }
    return {
      success: true,
      courses: courses.map(course => this.transformInstructor(course)),
    };
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

  private transformInstructor(course: CourseDocument): courseInstructor {
    const totalRating = course.reviews.reduce(
      (sum, review) => sum + review.rating,
      0
    );
    const averageRating = course.reviews.length
      ? totalRating / course.reviews.length
      : 0;
    return {
      id: (course._id as mongoose.Types.ObjectId).toString(),
      title: course.title,
      thumbnailPreview: course.thumbnailPreview,
      category: course.category.name,
      level: course.level,
      reviews: averageRating,
      students: course.students.length,
      instructorName:(course.instructor as any).userName,
      instructorImg:(course.instructor as any).profileImg,
      createdAt: course.createdAt,
    };
  }

  private transformCourseGenerale(course: CourseDocument): courseDataGenerale {
    const totalRating = course.reviews.reduce(
      (sum, review) => sum + review.rating,
      0
    );
    const averageRating = course.reviews.length
      ? totalRating / course.reviews.length
      : 0;
    const totaleDuration = course.sections.reduce((total: number, section: Section) => {
      return total + section.lectures.reduce((sectionTotal: number, lecture: Lecture) => {
        return sectionTotal + lecture.duration;
      }, 0);
    }, 0);
    return {
      id: (course._id as mongoose.Types.ObjectId).toString(),
      title: course.title,
      description: course.description,
      thumbnailPreview: course.thumbnailPreview,
      category: course.category.name,
      level: course.level,
      price: course.pricing.price,
      reviews: averageRating,
      duration: totaleDuration,
      students: course.students.length,
      instructorName:(course.instructor as any).userName,
      instructorImg:(course.instructor as any).profileImg,
      InstructorId:(course.instructor as any).id,
      createdAt: course.createdAt,
    };
  }
  private transformCourseDetails(course: CourseDocument): courseDataDetails {
    const totalRating = course.reviews.reduce(
      (sum, review) => sum + review.rating,
      0
    );
    const averageRating = course.reviews.length
      ? totalRating / course.reviews.length
      : 0;
      const ratingsCount = [0, 0, 0, 0, 0]; 

      course.reviews.forEach((review) => {
        const rating = review.rating;
        if (rating >= 1 && rating <= 5) {
          ratingsCount[rating - 1]++;
        }
      });
    const totaleDuration = course.sections.reduce((total: number, section: Section) => {
      return total + section.lectures.reduce((sectionTotal: number, lecture: Lecture) => {
        return sectionTotal + lecture.duration;
      }, 0);
    }, 0);
    return {
      id: (course._id as mongoose.Types.ObjectId).toString(),
      title: course.title,
      description: course.description,
      thumbnailPreview: course.thumbnailPreview,
      category: course.category.name,
      level: course.level,
      price: course.pricing.price,
      reviews: averageRating,
      reviewsLenght: course.reviews.length,
      ratingsCount: ratingsCount,
      duration: totaleDuration,
      sections: course.sections.map((section) => ({
        id: section.id.toString(),
        title: section.title,
        orderIndex: section.orderIndex,
        isPreview: section.isPreview,
        lectures: section.lectures.map((lecture) => ({
          id: lecture.id.toString(),
          title: lecture.title,
          description: lecture.description,
          duration: lecture.duration,
          videoUrl: lecture.videoUrl,
          publicId: lecture.publicId,
          isPreview: lecture.isPreview,
        })),
      })),
      students: course.students.length,
      instructorName:(course.instructor as any).userName,
      instructorImg:(course.instructor as any).profileImg,
      InstructorId:(course.instructor as any).id,
      instructorExpertise:(course.instructor as any).expertise,
      instructorBaiography:(course.instructor as any).biography,
      createdAt: course.createdAt,
    };
  }
}

export const courseService = new CourseService();
