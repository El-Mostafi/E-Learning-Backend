import { BadRequestError, currentUser, requireAuth, roleIsStudent } from "../../../common";
import { Request, Response, NextFunction, Router } from "express";
import { validationResult } from "express-validator";
import { CertificateService } from "../../service/certificate/certificate.service";
import mongoose from "mongoose";
import Course from "../../models/course";
import User from "../../models/user";

const router = Router();

router.get(
  "/api/generate-certificate/:courseId",
  requireAuth,
  currentUser,
  roleIsStudent,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.courseId;
      const studentId = req.currentUser!.userId;
      // Validate input
      if (!courseId) {
        return next(new BadRequestError("Course ID and Student ID are required."));
      }
      if(!studentId){
        return next(new BadRequestError("Student should be logged In."));
      }

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(studentId)) {
        return next(new BadRequestError("Invalid course ID or student ID format."));
      }

      // Get course and student info for filename
      const [course, student] = await Promise.all([
        Course.findById(courseId),
        User.findById(studentId)
      ]);

      if (!course || !student) {
        return next(new BadRequestError("Course or student not found."));
      }

      // Call the service to generate the certificate
      const certificateService = new CertificateService();
      const certificateBuffer = await certificateService.generateCertificate(
        new mongoose.Types.ObjectId(courseId),
        new mongoose.Types.ObjectId(studentId)
      );

      // Generate filename
      const filename = certificateService.generateCertificateFilename(
        course.title,
        student.userName
      );

      // Set headers for PDF download
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", certificateBuffer.length);

      // console.log("Certificate generated successfully for course:", courseId, "and student:", studentId);
      
      // Send the PDF buffer as response
      res.send(Buffer.from(certificateBuffer));
    } catch (error) {
      console.error("Error generating certificate:", error);
      
      // Send JSON error response instead of PDF
      res.status(500).json({ 
        error: "Failed to generate certificate.",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
);

export { router as certificateRouter };