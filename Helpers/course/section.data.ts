import mongoose from "mongoose";

interface SectionDataV {
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

export default SectionDataV;
