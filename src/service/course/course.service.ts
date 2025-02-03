import mongoose from "mongoose";
import Course from "../../models/course";
import { CourseDto } from "../../routers/course/dtos/course.dto";

export class CourseService {
  constructor() {}

  async create(courseDto: CourseDto, instructorId: mongoose.Schema.Types.ObjectId) {
    const course = await Course.build(courseDto);
    course.instructor = instructorId;
    await course.save();
    return course;
  }

  async findAll() {
    return await Course.find({isPublished: true}).where().populate("instructor", ["userName", "email", "profileImg", "aboutMe", "speciality"]);
  }

  async findOneById(id: string) {
    return await Course.findById(id).populate("instructor", ["userName", "email", "profileImg", "aboutMe", "speciality"]);
  }

  async updateOneById(id: string, courseDto: CourseDto) {
    return await Course.findByIdAndUpdate(id, courseDto, { new: true });
  }

  async deleteOneById(id: string) {
    return await Course.findByIdAndDelete(id);
  }

  async publishOneById(id: string) {
    return await Course.findByIdAndUpdate(
      id,
      { isPublished: true },
      { new: true }
    );
  }

  async unpublishOneById(id: string) {
    return await Course.findByIdAndUpdate(
      id,
      { isPublished: false },
      { new: true }
    );
  }
}

export const courseService = new CourseService();
