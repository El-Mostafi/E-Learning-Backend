import User from "../../models/user";
import Course, { CourseDocument, Lecture, Section } from "../../models/course";
import mongoose, { now } from "mongoose";
import Enrollment, { EnrollmentDocument } from "../../models/enrollment";
import { courseData, courseStudent } from "Helpers/course/course.data";
import { ClientSession } from "mongoose";
import {
  courseStudentTable,
  EnrollmentInterface,
  FindAllEnrollmentsOptions,
} from "../../routers/enrollment/dtos/enrollement.dto";

export class EnrollmentService {
  constructor() {}

  async enroll(
    courseId: mongoose.Types.ObjectId,
    participantId: mongoose.Types.ObjectId,
    session: ClientSession
  ) {
    const [course, participant] = await Promise.all([
      Course.findById(courseId).session(session),
      User.findById(participantId).session(session),
    ]);

    if (!course) {
      throw new Error("Course not found");
    }
    if (!participant) {
      throw new Error("Participant not found");
    }

    const already = await Enrollment.findOne({
      course: courseId,
      participant: participantId,
    })
      .session(session)
      .lean();

    if (already) {
      return { success: false, message: "Participant already enrolled!" };
    }

    const enrollment = Enrollment.build({
      course: courseId,
      participant: participantId,
    });
    await enrollment.save({ session });

    await Promise.all([
      Course.updateOne(
        { _id: courseId },
        { $addToSet: { students: participantId } },
        { session }
      ),
      User.updateOne(
        { _id: participantId },
        { $addToSet: { enrollments: enrollment._id } },
        { session }
      ),
    ]);

    return { success: true, message: "Participant Enrolled Successfully!" };
  }

  async findAllOverview(userId: mongoose.Types.ObjectId) {
    const enrollments = await Enrollment.find({ participant: userId });

    if (enrollments.length === 0) {
      return { success: false, message: "No enrollment found" };
    }

    const transformedCourses = (
      await Promise.all(
        enrollments.map(async (enrollment) => {
          const course = await Course.findById(enrollment.course)
          if (!course) return null;
          return {
            id: course._id,
            title: course.title,
            thumbnailPreview: course.thumbnailPreview,
            progress: enrollment.progress,
            completed: enrollment.completed,
          };
        })
      )
    ).filter((course): course is courseStudentTable => course !== null);
    return {
      success: true,
      courses: transformedCourses,
    };
  }
  async findAllIds(userId: mongoose.Types.ObjectId) {
    const enrollments = await Enrollment.find({ participant: userId });

    if (enrollments.length === 0) {
      return { success: true, courses: [] };
    }
    const courseIds = enrollments.map((enrollment) => enrollment.course.toString());
    return {
      success: true,
      courses: courseIds,
    };
  }
  async findAll(
    userId: mongoose.Types.ObjectId,
    options: FindAllEnrollmentsOptions
  ) {
    const { page, limit, search, sort } = options;

    try {
      let enrollmentQuery = Enrollment.find({ participant: userId });

      const enrollments = await enrollmentQuery.exec();

      if (enrollments.length === 0) {
        return {
          success: false,
          message: "No enrollment found",
          courses: [],
          totalCourses: 0,
          currentPage: page,
          totalPages: 0,
        };
      }
      // Transform all courses first
      const allTransformedCourses = (
        await Promise.all(
          enrollments.map(async (enrollment) => {
            const course = await Course.findById(enrollment.course).populate(
              "instructor",
              ["userName", "profileImg"]
            );
            if (!course) return null;
            return this.transformCourseGenerale(course, enrollment);
          })
        )
      ).filter((course): course is courseStudent => course !== null);

      // Apply search filter if provided
      let filteredCourses = allTransformedCourses;
      if (search && search.trim()) {
        const searchTerm = search.toLowerCase().trim();
        filteredCourses = allTransformedCourses.filter(
          (course) =>
            course.title.toLowerCase().includes(searchTerm) ||
            course.description.toLowerCase().includes(searchTerm) ||
            course.category.toLowerCase().includes(searchTerm) ||
            (course.instructorName &&
              course.instructorName.toLowerCase().includes(searchTerm))
        );
      }
      // Apply sorting
      const sortedCourses = [...filteredCourses].sort((a, b) => {
        switch (sort) {
          case "newest":
            return (
              new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
            );

          case "title":
            return a.title.localeCompare(b.title);

          case "progress":
            if (a.progress !== b.progress) {
              return b.progress - a.progress;
            }
            if (a.completed !== b.completed) {
              return a.completed ? -1 : 1;
            }
            return 0;

          case "rating":
            return b.reviews - a.reviews;

          default:
            return 0;
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
      }
    } catch (error) {
      console.error("Error in findAllOverview:", error);
      return {
        success: false,
        message: "Failed to fetch enrollments",
        courses: [],
        currentPage: page,
        totalPages: 0,
        totalCourses: 0,
      };
    }
  }

  // Helper method for getting count with search
  

  async findOneById(userId: mongoose.Types.ObjectId, courseId: string) {
    const enrollment: EnrollmentInterface | null = await Enrollment.findOne({
      course: courseId,
      participant: userId,
    });
    if (!enrollment) {
      return { success: false, message: "Participant is not enrolled" };
    }
    return { success: true, enrollment: enrollment };
  }

  async markQuizPassed(
    courseId: mongoose.Types.ObjectId,
    participantId: mongoose.Types.ObjectId,
    score: number
  ) {
    const enrollment = await Enrollment.findOne({
      course: courseId,
      participant: participantId,
    });

    if (!enrollment) {
      return { success: false, message: "Enrollment not found" };
    }

    enrollment.hasPassedQuizze = true;
    enrollment.QuizzeScore = score;

    await enrollment.save();

    return { success: true, enrollment };
  }

  async updateProgress(
    courseId: mongoose.Types.ObjectId,
    sectionId: mongoose.Types.ObjectId,
    lectureId: mongoose.Types.ObjectId,
    participantId: mongoose.Types.ObjectId
  ) {
    const participant = await User.findById(participantId.toString());
    if (!participant) {
      return { success: false, message: "Participant Not Found" };
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, message: "Course Not Found" };
    }

    const section = course.sections.find(
      (section: Section) => section._id.toString() === sectionId.toString()
    );

    if (!section) {
      return { success: false, message: "Section Not Found" };
    }
    const lecture = section.lectures.find(
      (lecture: Lecture) => lecture._id.toString() === lectureId.toString()
    );

    if (!lecture) {
      return { success: false, message: "Lecture Not Found" };
    }

    const enrollment = await Enrollment.findOne({
      course: courseId,
      participant: participantId,
    });
    if (!enrollment)
      return { success: false, message: "No enrollment was found" };

    if (enrollment.completed) {
      return { success: true, enrollment: enrollment };
    }

    // Check if the lecture is already completed
    const isLectureCompleted = enrollment.completedSections.some(
      (completedSection) =>
        completedSection.sectionId.toString() === sectionId.toString() &&
        completedSection.lectureId.toString() === lectureId.toString()
    );

    if (isLectureCompleted) {
      return { success: true, enrollment: enrollment };
    }

    const numberOflectures = course.sections.reduce(
      (acc, section) => acc + section.lectures.length,
      0
    );

    if (numberOflectures === undefined || numberOflectures === 0) {
      return { success: false, message: "No Lectures Found in this course" };
    }

    // Mark the lecture as completed
    enrollment.completedSections.push({
      sectionId: sectionId,
      lectureId: lectureId,
      completedAt: new Date(),
    });

    const numberOfCompletedLectures = enrollment.completedSections.length;
    const progress = Math.floor(
      (numberOfCompletedLectures / numberOflectures) * 100
    );

    enrollment.progress = progress;
    // console.log("numberOflectures", numberOflectures);
    // console.log("numberOfCompletedLectures", numberOfCompletedLectures);
    // console.log("progress", progress);

    if (progress === 100) {
      enrollment.completed = true;
      enrollment.completedAt = new Date();
    }
    await enrollment.save();
    return { success: true, enrollment: enrollment };
  }

  async withdraw(
    courseId: mongoose.Types.ObjectId,
    participantId: mongoose.Types.ObjectId
  ) {
    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, message: "Course not found" };
    }

    const participant = await User.findById(participantId);
    if (!participant) {
      return { success: false, message: "Participant not found" };
    }

    // Remove the student id from the course
    course.students = course.students.filter(
      (student) => student.toString() !== participantId.toString()
    );
    await course.save();

    // Get the enrollment
    const enrollment = await Enrollment.findOne({
      participant: participantId.toString(),
      course: courseId.toString(),
    });

    if (!enrollment) {
      return { success: false, message: "Enrollment not found" };
    }

    const enrollmentId = enrollment._id;
    // Remove the enrollment from the user enrollments
    participant.enrollments = participant.enrollments.filter(
      (enr) => enr.toString() !== enrollmentId
    );

    // Remove the enrollment document
    await Enrollment.findByIdAndDelete(enrollmentId);
    return { success: true, message: "Course withdrawn successfully!!" };
  }

  private transformCourseGenerale(
    course: CourseDocument,
    enrollment: EnrollmentDocument
  ): courseStudent {
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
    const lectureCount = course.sections.reduce(
      (total, section) => total + section.lectures.length,
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
      createdAt: course.createdAt,
      lectureTotal: lectureCount,
      completedSections: enrollment.completedSections.length,
      completed: enrollment.completed,
      completedAt: enrollment.completedAt,
      startedAt: enrollment.startedAt,
      progress: enrollment.progress,
    };
  }
}
