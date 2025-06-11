import mongoose from "mongoose";
import Course, { CourseDocument, Section, Lecture } from "../../models/course";
import {
  AugmentedCourse,
  CourseDto,
  CourseDtoWithCoupons,
  FindAllInstructorCoursesOptions,
  GetAllCoursesOptions,
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
import { CartItem } from "../../models/cartItem";
import User, { UserDocument } from "../../models/user";

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
      course: this.transformCourse(
        course,
        enrollment,
        cartItem.appliedCoupon === undefined ? null : cartItem.appliedCoupon
      ),
    };
  }

  async findOneByIdForUpdate(
    userId: mongoose.Types.ObjectId,
    courseId: string,
    userRole: string
  ) {
    const course = await Course.findById(courseId);

    if (!course) {
      return { success: false, message: "Course not Found" };
    }
    if (
      course.instructor.toString() !== userId.toString() &&
      userRole !== "admin"
    ) {
      return { success: false, message: "Permission denied!" };
    }

    return { success: true, course: this.transformCourseToEdit(course) };
  }

  async findPublishedCourses() {
    const courses = await Course.find({ isPublished: true }).populate(
      "instructor",
      ["id", "userName", "profileImg"]
    );
    if (!courses) {
      return { success: false, message: "No published courses found" };
    }

    return {
      success: true,
      courses: courses.map((course) => this.transformCourseGenerale(course)),
    };
  }

  async findAllByInstructorId(
    instructorId: mongoose.Types.ObjectId,
    options: FindAllInstructorCoursesOptions
  ) {
    const { page, limit, search, sort } = options;
    try {
      const courses = await Course.find({ instructor: instructorId }).populate(
        "instructor",
        ["userName", "profileImg", "AboutMe", "speciality"]
      );
      if (!courses) {
        return { success: false, message: "No courses found" };
      }
      const allTransformedCourses = courses.map((course) =>
        this.transformInstructor(course)
      );

      let filteredCourses = allTransformedCourses;
      if (search && search.trim()) {
        const searchTerm = search.toLowerCase().trim();
        filteredCourses = allTransformedCourses.filter(
          (course) =>
            course.title.toLowerCase().includes(searchTerm) ||
            course.category.toLowerCase().includes(searchTerm)
        );
      }
      // Apply sorting
      const sortedCourses = [...filteredCourses].sort((a, b) => {
        switch (sort) {
          case "title":
            return a.title.localeCompare(b.title);

          case "popularity":
            return b.students - a.students;

          case "rating":
            return b.reviews - a.reviews;

          default:
            return (
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
        }
      });
      const totalCount = sortedCourses.length;
      const totalPages = Math.ceil(totalCount / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;

      const paginatedCourses = sortedCourses.slice(startIndex, endIndex);

      return {
        success: true,
        courses: paginatedCourses,
        currentPage: page,
        totalPages,
        totalCourses: totalCount,
      };
    } catch (error) {
      console.error("Error in findAllOverview:", error);
      return {
        success: false,
        message: "Failed to fetch enrollments",
      };
    }
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
    courseDto: CourseDtoWithCoupons,
    userRole: string
  ) {
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, message: "Course not found" };
    }
    if (
      course.instructor.toString() !== userId.toString() &&
      userRole !== "admin"
    ) {
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

  async deleteOneById(
    userId: mongoose.Types.ObjectId,
    courseId: string,
    userRole: string
  ) {
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, message: "Course not found!" };
    }
    if (
      course.instructor.toString() !== userId.toString() &&
      userRole !== "admin"
    ) {
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

  async publishOneById(
    userId: mongoose.Types.ObjectId,
    courseId: string,
    userRole: string
  ) {
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, message: "Course not found!" };
    }
    if (
      course.instructor.toString() !== userId.toString() &&
      userRole !== "admin"
    ) {
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
  async togglePublishStatus(courseId: string): Promise<{
    success: boolean;
    message: string;
    isPublished?: boolean;
  }> {
    try {
      const course = await Course.findById(courseId);

      if (!course) {
        return { success: false, message: "Course not found." };
      }

      const newPublishStatus = !course.isPublished;

      course.isPublished = newPublishStatus;
      await course.save();

      // 6. Return a successful response
      const message = newPublishStatus
        ? "Course published successfully."
        : "Course unpublished successfully.";

      return {
        success: true,
        message,
        isPublished: newPublishStatus,
      };
    } catch (error: any) {
      console.error("Error toggling publish status:", error);
      // Return a specific error if asset tagging failed, or a generic one otherwise.
      const errorMessage =
        error.message === "Failed to update asset tags on the cloud."
          ? "Failed to update asset tags. The course status was not changed."
          : "An unexpected error occurred while updating the course status.";

      return { success: false, message: errorMessage };
    }
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
  async getAllCourses(options: GetAllCoursesOptions): Promise<{
    courses: AugmentedCourse[];
    totalPages: number;
    currentPage: number;
    totalCourses: number;
  }> {
    const { page, limit, search, status, category, level, language } = options;

    // 1. Build the dynamic query object
    const query: any = {};
    if (status) {
      query.isPublished = status === "published";
    }
    if (category) {
      // Querying a field within a sub-document
      query["category.name"] = { $regex: category, $options: "i" };
    }
    if (level) {
      query.level = level;
    }
    if (language) {
      query.language = language;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // 2. Fetch the base course data from the database
    // We populate the instructor to get their name.
    const courses = await Course.find(query)
      .populate<{ instructor: Pick<UserDocument, "userName"> }>(
        "instructor",
        "userName" // Select only the userName field from the User document
      )
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 })
      .lean() // .lean() for performance and easier object manipulation
      .exec();

    // 3. Augment the courses with calculated data
    const augmentedCourses: AugmentedCourse[] = courses.map((course) => {
      // Calculate Average Rating
      const totalRating = course.reviews.reduce(
        (sum, review) => sum + review.rating,
        0
      );
      const averageRating =
        course.reviews.length > 0
          ? parseFloat((totalRating / course.reviews.length).toFixed(1))
          : 0;

      // Get student count
      const numberOfStudents = course.students?.length || 0;

      // Calculate Revenue
      const revenue = numberOfStudents * (course.pricing.price || 0);

      return {
        id: course._id.toString(),
        title: course.title,
        numberOfSections: course.sections?.length || 0,
        category: course.category?.name || "N/A",
        // The populated instructor is an object, so we access its property
        instructor: course.instructor?.userName || "N/A",
        numberOfStudents: numberOfStudents,
        averageRating: averageRating,
        revenue: revenue,
        status: course.isPublished ? "Published" : "Draft",
        createdAt: course.createdAt,
      };
    });

    // 4. Get the total count for pagination
    const totalCourses = await Course.countDocuments(query);

    // 5. Return the final paginated and augmented result
    return {
      courses: augmentedCourses,
      totalPages: Math.ceil(totalCourses / limit),
      currentPage: page,
      totalCourses,
    };
  }
  public async getAllCategories(): Promise<string[]> {
    const categories = await Course.distinct("category.name");
    return categories;
  }
  async getUsedLanguages(): Promise<{
    success: boolean;
    languages?: string[];
    message?: string;
  }> {
    try {
      const languages = await Course.distinct("language", {
        isPublished: true,
      });

      if (!languages) {
        return { success: false, message: "Could not fetch languages." };
      }

      return { success: true, languages };
    } catch (error) {
      console.error("Error fetching distinct course languages:", error);
      return {
        success: false,
        message: "An error occurred while fetching languages.",
      };
    }
  }

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
