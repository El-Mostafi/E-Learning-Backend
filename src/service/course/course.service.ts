import Course from "src/models/course";
import { CourseDto } from "../../routers/course/dtos/course.dto";

export class CourseService {
    constructor(
    ) {}

    async create(courseDto: CourseDto){
        const course = await Course.build(courseDto);
        await course.save();
        return course;
    }

    async findAll(){
        return await Course.find();
    }

    async findOneById(id: string){
        return await Course.findById(id);
    }

    
}