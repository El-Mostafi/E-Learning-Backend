import User from "../../models/user";
import Course from "../../models/course";
import mongoose from "mongoose";
import Enrollment from "../../models/enrollment";

export class EnrollmentService {
  constructor() {}

  async enroll(
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

    // Check if the enrollment already exists
    const existingEnrollment = await Enrollment.findOne({
      courseId,
      userId: participantId,
    });
    if (existingEnrollment) {
      return { success: false, message: "Participant already enrolled!" };
    }

    // Update the course students
    course.students.push(participantId);
    await course.save();

    // Create and save the enrollment
    const enrollment = Enrollment.build({
      course: courseId,
      participant: participantId,
    });
    enrollment.save();

    // Update the participant enrollments
    participant.enrollments.push(
      enrollment._id as mongoose.Types.ObjectId
    );
    await participant.save();

    return { success: true, enrollment };
  }

  async findAll(userId: mongoose.Types.ObjectId) {
    const enrollments = await Enrollment.find({ participant: userId }).populate(
      "course"
    );

    if (!enrollments) {
      return { success: false, message: "No enrollment found" };
    }

    const courses = enrollments.map((enrollment) => enrollment.course);
    return {success: true, courses: courses};
  }

  async findOneById(
    userId: mongoose.Types.ObjectId,
    enrollmentId: string
  ) {
    const enrollment = await Enrollment.findOne({
      _id: enrollmentId,
      userId: userId,
    }).populate("courseId");
    if (!enrollment) {
      return { success: false, message: "Participant is not enrolled" };
    }
    const { course } = enrollment;
    return { success: true, course: course };
  }

  async updateProgress(
    courseId: mongoose.Types.ObjectId,
    participantId: mongoose.Types.ObjectId
  ) {
    const participant = await Course.findById(participantId);
    if (!participant) {
      return { success: false, message: "Participant Not Found" };
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return { success: false, message: "Course Not Found" };
    }

    const numberOflectures = course.sections.reduce(
      (acc, section) => acc + section.lectures.length,
      0
    );
    if (numberOflectures === undefined) {
      return { success: false, message: "No Lectures Found in this course" };
    }
    const enrollment = await Enrollment.findOne({
      courseId: courseId,
      userId: participantId,
    });
    if (!enrollment)
      return { success: false, message: "Not enrollment was found" };

    enrollment.progress++;
    if (enrollment.progress >= numberOflectures) {
      enrollment.completed = true;
      enrollment.completedAt = new Date();
    }
    await enrollment.save();
    return { success: true, enrollment };
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
      (studentId) => studentId.toString() !== participantId.toString()
    );

    // Get the enrollment
    const enrollment = await Enrollment.findOne({
      userId: participantId,
      courseId: courseId,
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

  private transformCourse(course: any) {
    const participants = course.students ? course.students.length : 0;
    const certifications = course.certificates ? course.certificates.length : 0;
    const { students, certificates, ...rest } = course;
    return {
        ...rest,
        participants,
        certifications,
    };
}
}
