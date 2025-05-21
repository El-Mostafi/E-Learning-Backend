import mongoose from "mongoose";

interface SectionData {
  id: string;
  title: string;
  orderIndex: number;
  description: string;
  lectures: LectureData[];
}
interface LectureData {
  id: string;
  title: string;
  description: string;
  duration: number;
  videoUrl: string;
  publicId: string;
}

export default SectionData;
