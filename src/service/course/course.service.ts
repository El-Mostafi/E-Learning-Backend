import mongoose from "mongoose";
import Course, { CourseDocument, Section, Lecture } from "../../models/course";
import {
  CourseDto,
  CourseDtoWithCoupons,
} from "../../routers/course/dtos/course.dto";
import {
  courseData,
  courseDataGenerale,
  courseInstructor,
} from "../../../Helpers/course/course.data";
import { Types } from "mongoose";
import { BadRequestError } from "../../../common";
import Enrollment, { EnrollmentDocument } from "../../models/enrollment";

export class CourseService {
  constructor() {}
  async create(
    courseDto: CourseDtoWithCoupons,
    instructorId: mongoose.Types.ObjectId
  ) {
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

  async findAll(userId: mongoose.Types.ObjectId | undefined) {
    const courses = await Course.find().populate("instructor", [
      "userName",
      "profileImg",
      "AboutMe",
      "speciality",
    ]);

    if (!courses) {
      return { success: false, message: "No courses found" };
    }

    const transformedCourses = await Promise.all(
      courses.map(async (course: CourseDocument) => {
        const enrollment: EnrollmentDocument | null = await Enrollment.findOne({
          participant: userId,
          course: course._id,
        });
        return this.transformCourse(course, enrollment);
      })
    );

    return { success: true, courses: transformedCourses };
  }

  async findOneById(
    courseId: string,
    userId: mongoose.Types.ObjectId | undefined
  ) {
    const course = await Course.findById(courseId).populate("instructor", [
      "id",
      "userName",
      "profileImg",
      "expertise",
      "biography",
    ]);

    if (!course) {
      return { success: false, message: "Course not Found" };
    }

    const enrollment: EnrollmentDocument | null = await Enrollment.findOne({
      participant: userId,
      course: courseId,
    });

    return { success: true, course: this.transformCourse(course, enrollment) };
  }

  async findPublishedCourses() {
    const courses = await Course.find({ isPublished: true }).populate(
      "instructor",
      ["id", "userName", "profileImg", "AboutMe", "speciality"]
    );
    if (!courses) {
      return { success: false, message: "No published courses found" };
    }

    return {
      success: true,
      courses: courses.map((course) => this.transformCourseGenerale(course)),
    };
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
      courses: courses.map((course) => this.transformInstructor(course)),
    };
  }

  async findAllByCategoryId(
    categoryId: string,
    userId: mongoose.Types.ObjectId | undefined
  ) {
    if (!categoryId) {
      return { success: false, message: "Category not found" };
    }

    const courses = await Course.find({ "category._id": categoryId }).populate(
      "instructor",
      ["userName", "profileImg", "AboutMe", "speciality"]
    );

    if (!courses) {
      return { success: false, message: "No courses found" };
    }

    const transformedCourses = courses.map(async (course: CourseDocument) => {
      const enrollment: EnrollmentDocument | null = await Enrollment.findOne({
        participant: userId,
        course: course._id,
      });
      return this.transformCourse(course, enrollment);
    });

    return { success: true, courses: transformedCourses };
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

  async verifyCoupon(courseId: string, couponCode: string) {
    const course = await Course.findById(courseId);
    if (!course) throw new BadRequestError("Course not found");

    const coupon = course.coupons.find((c) => c.code === couponCode);
    if (!coupon) throw new BadRequestError("Invalid coupon code");
    if (coupon.expiryDate < new Date())
      throw new BadRequestError("Coupon expired");
    if (coupon.maxUses <= 0) throw new BadRequestError("Coupon exhausted");
    return {
      valid: true,
      discountPercentage: coupon.discountPercentage,
    };
  }

  checkEnrollment = async (
    userId: mongoose.Types.ObjectId,
    courseId: mongoose.Types.ObjectId
  ) => {
    if (!userId) {
      return { success: false, message: "User not found" };
    }
    if (!courseId) {
      return { success: false, message: "Course not found" };
    }
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, message: "Course not found" };
    }
    if (course.students.includes(userId)) {
      return {
        success: true,
        message: "User is already enrolled in the course",
      };
    }
    return { success: false, message: "User is not enrolled in the course" };
  };

  private transformCourse(
    course: CourseDocument,
    enrollment: EnrollmentDocument | null
  ): courseData {
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
    const totaleDuration = course.sections.reduce(
      (total: number, section: Section) => {
        return (
          total +
          section.lectures.reduce((sectionTotal: number, lecture: Lecture) => {
            return sectionTotal + lecture.duration;
          }, 0)
        );
      },
      0
    );

    return {
      id: (course._id as mongoose.Types.ObjectId).toString(),
      title: course.title,
      description: course.description,
      thumbnailPreview: course.thumbnailPreview,
      level: course.level,
      language: course.language,
      category: course.category.name,
      price: !course.pricing.isFree ? course.pricing.price : 0,
      reviews: averageRating,
      reviewsLenght: course.reviews.length,
      ratingsCount: ratingsCount,
      feedbacks: course.reviews.map((review) => ({
        rating: review.rating,
        comment: review.text,
        userName: review.userName,
        userImg: review.userImg,
        createdAt: review.createdAt,
      })),
      sections: course.sections.map((section: Section) => ({
        id: (section._id as mongoose.Types.ObjectId).toString(),
        title: section.title,
        description: section.description,
        orderIndex: section.orderIndex,
        isPreview: section.isPreview,
        lectures: section.lectures.map((lecture: Lecture) => ({
          id: (lecture._id as mongoose.Types.ObjectId).toString(),
          title: lecture.title,
          description: lecture.description,
          duration: lecture.duration,
          isPreview: lecture.isPreview,
          videoUrl: enrollment ? lecture.videoUrl : "",
          publicId: enrollment ? lecture.publicId : undefined,
        })),
      })),
      certifications: course.certificates.length,
      students: course.students.length,
      instructorName: (course.instructor as any).userName,
      instructorImg: (course.instructor as any).profileImg,
      progress: enrollment ? enrollment.progress : undefined,
      completed: enrollment ? enrollment.completed : undefined,
      completedAt: enrollment ? enrollment.completedAt : undefined,
      startedAt: enrollment ? enrollment.startedAt : undefined,
      duration: totaleDuration,
      createdAt: course.createdAt,
      InstructorId: course.instructor.toString(),
      instructorExpertise: (course.instructor as any).expertise,
      instructorBiography: (course.instructor as any).biography,
      isUserEnrolled: enrollment ? true : false,
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
      language: course.language,
      thumbnailPreview: course.thumbnailPreview,
      category: course.category.name,
      level: course.level,
      reviews: averageRating,
      students: course.students.length,
      instructorName: (course.instructor as any).userName,
      instructorImg: (course.instructor as any).profileImg,
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
    const totaleDuration = course.sections.reduce(
      (total: number, section: Section) => {
        return (
          total +
          section.lectures.reduce((sectionTotal: number, lecture: Lecture) => {
            return sectionTotal + lecture.duration;
          }, 0)
        );
      },
      0
    );
    return {
      id: (course._id as mongoose.Types.ObjectId).toString(),
      title: course.title,
      description: course.description,
      language: course.language,
      thumbnailPreview: course.thumbnailPreview,
      category: course.category.name,
      level: course.level,
      price: course.pricing.price,
      reviews: averageRating,
      duration: totaleDuration,
      students: course.students.length,
      instructorName: (course.instructor as any).userName,
      instructorImg: (course.instructor as any).profileImg,
      InstructorId: (course.instructor as any).id,
      createdAt: course.createdAt,
    };
  }
  private transformCourseDetails(
    course: CourseDocument,
    enrollment: EnrollmentDocument | undefined
  ): courseData {
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
    const totaleDuration = course.sections.reduce(
      (total: number, section: Section) => {
        return (
          total +
          section.lectures.reduce((sectionTotal: number, lecture: Lecture) => {
            return sectionTotal + lecture.duration;
          }, 0)
        );
      },
      0
    );
    return {
      id: (course._id as mongoose.Types.ObjectId).toString(),
      title: course.title,
      description: course.description,
      language: course.language,
      thumbnailPreview: course.thumbnailPreview,
      category: course.category.name,
      level: course.level,
      price: course.pricing.price,
      reviews: averageRating,
      reviewsLenght: course.reviews.length,
      ratingsCount: ratingsCount,
      feedbacks: course.reviews.map((review) => ({
        rating: review.rating,
        comment: review.text,
        userName: review.userName,
        userImg: review.userImg,
        createdAt: review.createdAt,
      })),
      duration: totaleDuration,
      sections: course.sections.map((section) => ({
        id: section.id.toString(),
        title: section.title,
        description: section.description,
        orderIndex: section.orderIndex,
        isPreview: section.isPreview,
        lectures: section.lectures.map((lecture) => ({
          id: lecture.id.toString(),
          title: lecture.title,
          description: lecture.description,
          duration: lecture.duration,
          videoUrl: enrollment ? lecture.videoUrl : "",
          publicId: enrollment ? lecture.publicId : undefined,
          isPreview: lecture.isPreview,
        })),
      })),
      students: course.students.length,
      instructorName: (course.instructor as any).userName,
      instructorImg: (course.instructor as any).profileImg,
      InstructorId: (course.instructor as any).id,
      instructorExpertise: (course.instructor as any).expertise,
      instructorBiography: (course.instructor as any).biography,
      certifications: course.certificates.length,
      createdAt: course.createdAt,
      progress: enrollment ? enrollment.progress : undefined,
      completed: enrollment ? enrollment.completed : undefined,
      completedAt: enrollment ? enrollment.completedAt : undefined,
      startedAt: enrollment ? enrollment.startedAt : undefined,
      isUserEnrolled: enrollment ? true : false,
    };
  }
}

export const courseService = new CourseService();
