export interface LectureDto {
    title: string;
    duration: number;
    videoUrl: string;
    thumbnailUrl: string;
}

export interface SectionDto {
    title: string;
    orderIndex: number;
    isPreview: boolean;
    lectures: LectureDto[];
}

export interface ExamDto {
    question: string;
    options: string[];
    correctAnswerIndex: number;
}

export interface CategoryDto {
    title: string;
    description: string;
}

export interface CourseDto {
    title: string;
    description: string;
    coverImg: string;
    level: string;
    language: string;
    price: number;
    oldPrice: number;
    category: CategoryDto;
    sections: SectionDto[];
    exam: ExamDto;
    isPublished: boolean;
    instructorId: string;
}

