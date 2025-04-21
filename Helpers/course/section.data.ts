import mongoose from "mongoose";

interface SectionData {
  id: string;
  title: string;
  orderIndex: number;
  isPreview: boolean;
  lectures: LectureData[];
}
interface LectureData {
  id: string;
  title: string;
  description: string;
  duration: number;
  videoUrl: string;
  publicId: string;
  isPreview: boolean;
}

export default SectionData;
