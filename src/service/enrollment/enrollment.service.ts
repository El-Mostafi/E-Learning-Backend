import User from "../../models/user";
import Course, { CourseDocument, Lecture, Section } from "../../models/course";
import mongoose from "mongoose";
import Enrollment, { EnrollmentDocument } from "../../models/enrollment";
import { courseData } from "Helpers/course/course.data";
import { ClientSession } from "mongoose";

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

  async findAll(userId: mongoose.Types.ObjectId) {
    const enrollments = await Enrollment.find({ participant: userId }).populate(
      {
        path: "course",
        populate: {
          path: "instructor",
          select: "userName profileImg",
          model: "User",
        },
      }
    );

    if (!enrollments) {
      return { success: false, message: "No enrollment found" };
    }

    const transformedCourses = await Promise.all(
      enrollments.map(async (enrollment: EnrollmentDocument) => {
        const course: CourseDocument | null = await Course.findOne({
          _id: enrollment.course,
          students: { $in: [userId] },
        });
        if (!course) {
          throw new Error("Course not found for the given user.");
        }
        return this.transformCourse(course, enrollment);
      })
    );

    return {
      success: true,
      courses: transformedCourses,
    };
  }

  async findOneById(userId: mongoose.Types.ObjectId, courseId: string) {
    const enrollment = await Enrollment.findOne({
      course: courseId,
      participant: userId,
    });
    if (!enrollment) {
      return { success: false, message: "Participant is not enrolled" };
    }
    return { success: true, enrollment: enrollment };
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
    console.log("numberOflectures", numberOflectures);
    console.log("numberOfCompletedLectures", numberOfCompletedLectures);
    console.log("progress", progress);

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
      isUserEnrolled: enrollment ? true : false,
    };
  }
}
