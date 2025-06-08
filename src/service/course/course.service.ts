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
  courseToEdit,
} from "../../../Helpers/course/course.data";
import { Types } from "mongoose";
import { BadRequestError } from "../../../common";
import Enrollment, { EnrollmentDocument } from "../../models/enrollment";
<<<<<<< HEAD
import { PopularityService } from "../popularity/popularity.service";
=======
import { CartItem } from "../../models/cartItem";
>>>>>>> 7f1c351fb08c6368b336fcbc9aacc7cb0ae4beee
import User from "../../models/user";

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
        return this.transformCourse(course, enrollment, null);
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
    const user = await User.findById(userId).select("cart").lean();

    if (!user) {
      return { success: false, message: "User not found" };
    }

    const cartItem = user.cart.find(
      (item: CartItem) => item.course.toString() === courseId
    );

    if (!cartItem) {
      return {
      success: true,
      course: this.transformCourse(course, enrollment, null),
    };
    }

    return {
      success: true,
      course: this.transformCourse(course, enrollment, cartItem.appliedCoupon===undefined?null:cartItem.appliedCoupon),
    };
  }

  async findOneByIdForUpdate(
    userId: mongoose.Types.ObjectId,
    courseId: string
  ) {
    const course = await Course.findById(courseId);

    if (!course) {
      return { success: false, message: "Course not Found" };
    }
    if (course.instructor.toString() !== userId.toString()) {
      return { success: false, message: "Permission denied!" };
    }

    return { success: true, course: this.transformCourseToEdit(course) };
  }

  async findPublishedCourses(
    page: number,
    limit: number,
    sortOption?: string,
    filterParams?: {
      ratings?: number[] | undefined;
      instructors?: string[] | undefined;
      price?: string | undefined;
      levels?: string[] | undefined;
      categories?: string[] | undefined;
      search?: string | undefined;
    }
  ) {
    console.log(filterParams);
    let sort: any = { createdAt: -1 };
    if (sortOption === "rating") {
      console.log("Sorting by rating");
      sort = { averageRating: -1 };
    }
    if (sortOption === "enrollmentCount") {
      console.log("Sorting by enrollment count");
      sort = { enrollmentCount: -1 };
    }
    if (sortOption === "popularity") {
      console.log("Sorting by popularity");
      const popularityService = new PopularityService();
      const popularityResult = await popularityService.getPopularCourses(
        3.0,
        page,
        limit
      );
      return {
        courses: popularityResult.data,
        totalCount: popularityResult.totalCount,
      };
    }

    const skip = (page - 1) * limit;

    const initialMatch: any = { isPublished: true };
    let filterByAverageRating =
      filterParams &&
      filterParams.ratings &&
      Array.isArray(filterParams.ratings);

    let filterByLevels =
      filterParams && filterParams.levels && Array.isArray(filterParams.levels);

    let filterByPrice = filterParams && filterParams.price;

    let filterByCategories =
      filterParams &&
      filterParams.categories &&
      Array.isArray(filterParams.categories);

    let keywordSearch = filterParams && filterParams.search;
    // Build keyword search filter if needed
    let keywordMatch: any = {};
    if (keywordSearch && typeof filterParams!.search === "string" && filterParams!.search.trim() !== "") {
      const searchRegex = new RegExp(filterParams!.search.trim(), "i");
      keywordMatch = {
      $or: [
        { title: searchRegex },
        { description: searchRegex },
        { "category.name": searchRegex },
      ],
      };
    }

 
    let filterByInstructors =
      filterParams &&
      filterParams.instructors &&
      Array.isArray(filterParams.instructors);

    let instructorObjectIds: mongoose.Types.ObjectId[] = [];
    if (filterByInstructors) {
      instructorObjectIds = filterParams!.instructors!.map(
        (id: string) => new mongoose.Types.ObjectId(id)
      );
    }

    const aggregationResult = await Course.aggregate([
      { $match: initialMatch },

      {
        $addFields: {
          enrollmentCount: { $size: "$students" },
          averageRating: {
            $cond: [
              { $eq: [{ $size: "$reviews" }, 0] },
              0,
              { $avg: "$reviews.rating" },
            ],
          },
        },
      },

      filterByAverageRating
        ? {
            $match: {
              averageRating: { $in: filterParams!.ratings },
            },
          }
        : { $match: {} },

      filterByLevels
        ? {
            $match: {
              level: { $in: filterParams!.levels },
            },
          }
        : { $match: {} },

      filterByCategories
        ? {
            $match: {
              "category.name": { $in: filterParams!.categories },
            },
          }
        : { $match: {} },

      filterByPrice
        ? {
            $match: {
              "pricing.isFree": filterParams!.price === "Free"
            },
          }
        : { $match: {} },

      filterByInstructors
        ? {
            $match: {
              instructor: { $in: instructorObjectIds },
            },
          }
        : { $match: {} },

      // Keyword search match
      Object.keys(keywordMatch).length > 0 ? { $match: keywordMatch } : { $match: {} },
        
      {
        $facet: {
          paginatedResults: [
            { $sort: sort },
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: "users",
                let: { instructorId: "$instructor" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$_id", "$$instructorId"] },
                          { $eq: ["$role", "instructor"] },
                        ],
                      },
                    },
                  },
                ],
                as: "instructorDetails",
              },
            },
            // Add instructor field with proper fallback
            {
              $addFields: {
                instructor: {
                  $cond: [
                    { $gt: [{ $size: "$instructorDetails" }, 0] },
                    { $arrayElemAt: ["$instructorDetails", 0] },
                    null,
                  ],
                },
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
      {
        $project: {
          data: "$paginatedResults",
          totalCount: { $arrayElemAt: ["$totalCount.count", 0] },
        },
      },
    ]);

    const result = aggregationResult[0] || { data: [], totalCount: 0 };

    const transformedCourses = await Promise.all(
      (result.data || []).map(async (course: CourseDocument) => {
        return this.transformCourseGenerale(course);
      })
    );

    return {
      courses: transformedCourses,
      totalCount: result.totalCount || 0,
    };

    // const courses = await Course.find({ isPublished: true }).populate(
    //   "instructor",
    //   ["id", "userName", "profileImg", "AboutMe", "speciality"]
    // );
    // if (!courses) {
    //   return { success: false, message: "No published courses found" };
    // }

    // return {
    //   success: true,
    //   courses: courses.map((course) => this.transformCourseGenerale(course)),
    // };
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
    return {
      success: true,
      courses: courses.map(this.transformCourseGenerale),
    };
  }

  async updateOneById(
    userId: mongoose.Types.ObjectId,
    courseId: string,
    courseDto: CourseDtoWithCoupons
  ) {
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, message: "Course not found" };
    }
    if (course.instructor.toString() !== userId.toString()) {
      return { success: false, message: "Permission denied!" };
    }
    const { coupons, ...courseData } = courseDto;
    const updatedCourse = await Course.findByIdAndUpdate(courseId, courseData, {
      new: true,
    });
    if (!updatedCourse) {
      return {
        success: false,
        message: "Error while trying to update the course",
      };
    }
    course.set("sections", []);
    course.set("quizQuestions", []);
    course.set("coupons", coupons);
    await course.save();
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

  async getCoursesFilteringData() {
    const categories = await Course.distinct("category.name");
    const levels = await Course.distinct("level");
    // _id is always included by default in Mongoose/MongoDB queries unless explicitly excluded
    const instructors = await User.find(
      { role: "instructor" },
      { userName: 1 }
    ).lean();

    if (!categories || categories.length === 0) {
      throw new BadRequestError("No categories found");
    }

    if (!levels || levels.length === 0) {
      throw new BadRequestError("No levels found");
    }

    if (!instructors || instructors.length === 0) {
      throw new BadRequestError("No instructors found");
    }

    return {
      categories,
      levels,
      instructors: instructors.map((inst: any) => ({
        userName: inst.userName,
        id: inst._id.toString(),
      })),
    };
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
    enrollment: EnrollmentDocument | null,
    appliedCoupon: { code: string; discountPercentage: number } | null
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
      imgPublicId: course.imgPublicId,
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
      appliedCoupon: appliedCoupon ?? undefined,
    };
  }
  private transformCourseToEdit(course: CourseDocument): courseToEdit {
    return {
      id: course.id.toString(),
      title: course.title,
      imgPublicId: course.imgPublicId,
      description: course.description,
      thumbnailPreview: course.thumbnailPreview,
      category: {
        name: course.category.name,
      },
      level: course.level,
      language: course.language,
      sections: course.sections.map((section) => ({
        id: section.id.toString(),
        title: section.title,
        description: section.description,
        orderIndex: section.orderIndex,
        lectures: section.lectures.map((lecture) => ({
          id: lecture.id.toString(),
          title: lecture.title,
          description: lecture.description,
          duration: lecture.duration,
          videoUrl: lecture.videoUrl,
          publicId: lecture.publicId,
        })),
      })),
      quizQuestions: course.quizQuestions.map((question) => ({
        id: question.id.toString(),
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
      })),
      pricing: {
        price: course.pricing.price,
        isFree: course.pricing.isFree,
      },
      oldPrice: course.oldPrice,
      coupons: course.coupons,
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
