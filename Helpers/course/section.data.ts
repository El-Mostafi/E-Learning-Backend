import mongoose from "mongoose";

interface SectionData {
  id: string;
  title: string;
  orderIndex: number;
  isPreview: boolean;
  lectures: string[];
}

export default SectionData;
