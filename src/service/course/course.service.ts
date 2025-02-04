import mongoose from "mongoose";
import Course from "../../models/course";
import { CourseDto } from "../../routers/course/dtos/course.dto";

export class CourseService {
    constructor() {}

    async create(
        courseDto: CourseDto,
        instructorId: mongoose.Types.ObjectId
    ) {
        const course = Course.build(courseDto);
        course.instructor = instructorId;
        await course.save();
        return this.transformCourse((await course.populate("instructor", [
                "userName",
                "profileImg",
                "AboutMe",
                "speciality",
            ])).toObject());
    }

    async findAll() {
        const courses = await Course.find()
            .populate("instructor", [
                "userName",
                "profileImg",
                "AboutMe",
                "speciality",
            ])
            .lean();

        return courses.map(this.transformCourse);
    }

    async findOneById(id: string) {
        const course = await Course.findById(id)
            .populate("instructor", [
                "userName",
                "profileImg",
                "AboutMe",
                "speciality",
            ])
            .lean();

        if (!course) {
            return null;
        }

        return this.transformCourse(course);
    }

    async findPublished() {
        const courses = await Course.find({ isPublished: true })
            .populate("instructor", [
                "userName",
                "profileImg",
                "AboutMe",
                "speciality",
            ])
            .lean();

        return courses.map(this.transformCourse);
    }

    async findAllByInstructorId(instructorId: mongoose.Types.ObjectId) {
        const courses = await Course.find({ instructor: instructorId })
            .populate("instructor", [
                "userName",
                "profileImg",
                "AboutMe",
                "speciality",
            ])
            .lean();

        return courses.map(this.transformCourse);
    }

    async findAllByCategoryId(categoryId: string) {
        const courses = await Course.find({ "category._id": categoryId })
            .populate("instructor", [
                "userName",
                "profileImg",
                "AboutMe",
                "speciality",
            ])
            .lean();

        return courses.map(this.transformCourse);
    }

    async updateOneById(
        userId: mongoose.Types.ObjectId,
        courseId: string,
        courseDto: CourseDto
    ) {
        const course = await Course.findById(courseId);
        if (!course) {
            return null;
        }
        if (course.instructor.toString() !== userId.toString()) {
            return null;
        }
        const updatedCourse = await Course.findByIdAndUpdate(courseId, courseDto, { new: true }).lean();
        return this.transformCourse(updatedCourse);
    }

    async deleteOneById(userId: mongoose.Types.ObjectId, courseId: string) {
        const course = await Course.findById(courseId);
        if (!course) {
            return null;
        }
        if (course.instructor.toString() !== userId.toString()) {
            return null;
        }
        const deletedCourse = await Course.findByIdAndDelete(courseId).lean();
        return this.transformCourse(deletedCourse);
    }

    async publishOneById(userId: mongoose.Types.ObjectId, courseId: string) {
        const course = await Course.findById(courseId);
        if (!course) {
            return null;
        }
        if (course.instructor.toString() !== userId.toString()) {
            return null;
        }
        const publishedCourse = await Course.findByIdAndUpdate(
            courseId,
            { isPublished: true },
            { new: true }
        ).lean();
        return this.transformCourse(publishedCourse);
    }

    async unpublishOneById(userId: mongoose.Types.ObjectId, courseId: string) {
        const course = await Course.findById(courseId);
        if (!course) {
            return null;
        }
        if (course.instructor.toString() !== userId.toString()) {
            return null;
        }
        const unpublishedCourse = await Course.findByIdAndUpdate(
            courseId,
            { isPublished: false },
            { new: true }
        ).lean();
        return this.transformCourse(unpublishedCourse);
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

export const courseService = new CourseService();
