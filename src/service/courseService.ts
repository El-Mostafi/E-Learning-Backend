import Course from "src/models/course";
import { CourseDto } from "src/routers/course/dtos/course.dto";

export class CourseService {
    constructor(
    ) {}

    async create(courseDto: CourseDto){
        const course = await Course.build(courseDto);
        await course.save();
        return course;
    }

}