import { PDFDocument, rgb, StandardFonts, PDFFont } from "pdf-lib";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import Course from "../../models/course";
import User from "../../models/user";
import Enrollment from "../../models/enrollment";
import {
  Certificate,
  CertificateDocument,
} from "../../models/schemas/certificate";
import { BadRequestError } from "../../../common/src/errors/bad-request-error";

export class CertificateService {
  private templatePath: string;

  constructor() {
    this.templatePath = path.resolve(
      process.cwd(),
      "templates/certificate-template.pdf"
    );
  }

  async generateCertificate(
    courseId: mongoose.Types.ObjectId,
    studentId: mongoose.Types.ObjectId
  ): Promise<Uint8Array> {
    try {
      // Fetch course and student data from the database
      const course = await Course.findById(courseId).populate("instructor");
      if (!course) {
        throw new Error("Course not found");
      }
      const student = await User.findById(studentId);
      if (!student) {
        throw new Error("Student not found");
      }
      const enrollment = await Enrollment.findOne({
        course: courseId,
        participant: studentId,
      });
      if (!enrollment) {
        throw new Error("Enrollment not found");
      }
      if (!enrollment.completed) {
        throw new Error("Student has not completed the course");
      }
      if (!enrollment.hasPassedQuizze) {
        throw new Error("Student has not passed the quizz");
      }

      let certificate = student.certificates.find(
        (cert: CertificateDocument) =>
          cert.course.toString() === courseId.toString()
      );

      if (!certificate) {
        const newCertificate = Certificate.build({
          course: courseId,
          courseTitle: course.title,
          instructorName: (course.instructor as any).userName,
          student: studentId,
          dateIssued: new Date(),
          url: "", //For now
        });
        student.certificates.push(newCertificate);
        course.certificates.push(newCertificate);
        await student.save();
        await course.save();
      }

      // Load the certificate template
      const templateBytes = fs.readFileSync(this.templatePath);
      const pdfDoc = await PDFDocument.load(templateBytes);

      // Embed fonts
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const timesRomanBoldFont = await pdfDoc.embedFont(
        StandardFonts.TimesRomanBold
      );
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBoldFont = await pdfDoc.embedFont(
        StandardFonts.HelveticaBold
      );
      // Added for more style options, though not used in final version to keep it clean
      const helveticaObliqueFont = await pdfDoc.embedFont(
        StandardFonts.HelveticaOblique
      );

      // Get the first page
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();

      // Center position helper
      const centerX = width / 2;

      // Add student name (large, centered, prominent)
      const studentName = student.userName.replace("|", " ");
      const studentNameWidth = this.getTextWidth(
        studentName,
        timesRomanBoldFont,
        48
      );
      firstPage.drawText(studentName, {
        x: centerX - studentNameWidth / 2,
        y: height - 260,
        size: 48,
        font: timesRomanBoldFont,
        color: rgb(0.1, 0.3, 0.7), // A professional blue
      });

      // Add decorative line under name
      firstPage.drawLine({
        start: { x: centerX - 200, y: height - 280 },
        end: { x: centerX + 200, y: height - 280 },
        thickness: 2,
        color: rgb(0.2, 0.4, 0.8),
      });

      // --- DECORATED COURSE TEXT SECTION (MODIFIED) ---

      let currentY = height - 340; // Starting Y for the course text block

      // 1. Preamble text
      const preText = "In recognition of successfully completing the";
      const preTextWidth = this.getTextWidth(preText, helveticaFont, 16);
      firstPage.drawText(preText, {
        x: centerX - preTextWidth / 2,
        y: currentY,
        size: 16,
        font: helveticaFont,
        color: rgb(0.2, 0.2, 0.2),
      });

      currentY -= 50; // Add space before the prominent course title

      // 2. The Course Title (decorated and prominent)
      const courseTitle = `"${course.title}"`; // Add quotes for emphasis
      const courseTitleWidth = this.getTextWidth(
        courseTitle,
        helveticaBoldFont,
        28
      );
      firstPage.drawText(courseTitle, {
        x: centerX - courseTitleWidth / 2,
        y: currentY,
        size: 28,
        font: helveticaBoldFont,
        color: rgb(0.1, 0.3, 0.7), // Match student name color
      });

      currentY -= 30; // Add space after the course title

      // 3. Post-amble text (split into lines for readability)
      const postText =
        "This achievement demonstrates their commitment to professional development and mastery of the subject matter.";
      const postTextLines = this.splitTextIntoLines(postText, 80);
      const lineHeight = 22;

      postTextLines.forEach((line) => {
        const lineWidth = this.getTextWidth(line, helveticaFont, 14);
        firstPage.drawText(line, {
          x: centerX - lineWidth / 2,
          y: currentY,
          size: 14,
          font: helveticaFont,
          color: rgb(0.4, 0.4, 0.4),
        });
        currentY -= lineHeight; // Move to the next line
      });

      // --- END OF DECORATED COURSE TEXT SECTION ---

      // Calculate position for instructor section based on the new text block height
      const instructorY = currentY - 50;

      // Add instructor name
      const instructorName = (course.instructor as any).userName.replace("|", " ");
      const instructorNameWidth = this.getTextWidth(
        instructorName,
        timesRomanBoldFont,
        18
      );
      firstPage.drawText(instructorName, {
        x: centerX - instructorNameWidth / 2,
        y: instructorY - 25,
        size: 18,
        font: timesRomanBoldFont,
        color: rgb(0.2, 0.4, 0.8),
      });

      // Add instructor title
      const instructorTitle =
        (course.instructor as any).expertise || "Course Instructor";
      const instructorTitleWidth = this.getTextWidth(
        instructorTitle,
        helveticaFont,
        14
      );
      firstPage.drawText(instructorTitle, {
        x: centerX - instructorTitleWidth / 2,
        y: instructorY - 45,
        size: 14,
        font: helveticaFont,
        color: rgb(0.4, 0.4, 0.4),
      });

      // Format completion date
      const completionDate = enrollment.completedAt!.toLocaleDateString(
        "en-US",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        }
      );

      // --- DECORATED DATE SECTION (MODIFIED) ---

      // Add completion date (bottom left, styled for blue background)
      const dateText = `Date of Completion: ${completionDate}`;
      const dateTextWidth = this.getTextWidth(dateText, helveticaFont, 12);
      firstPage.drawText(dateText, {
        x: 10,
        y: 50,
        size: 12,
        font: helveticaBoldFont,
        color: rgb(1, 1, 1), // White color for high contrast on blue
      });

      // Add a decorative underline for the date
      firstPage.drawLine({
        start: { x: 10, y: 45 },
        end: { x: 10 + dateTextWidth, y: 45 },
        thickness: 0.5,
        color: rgb(1, 1, 1), // White underline
      });

      // Add certificate ID (bottom right), also in white for consistency
      certificate = student.certificates.find(
        (cert: CertificateDocument) =>
          cert.course.toString() === courseId.toString()
      );
      if (!certificate) {
        throw new BadRequestError(
          "An error occured when generating certificate!"
        );
      }
      const certificateId = `CERT-${certificate.id
        .toString()
        .slice(-6)}-${studentId.toString().slice(-6)}`;
      const certIdText = `Certificate ID: ${certificateId}`;
      const certIdWidth = this.getTextWidth(certIdText, helveticaFont, 10);
      firstPage.drawText(certIdText, {
        x: width - certIdWidth - 50,
        y: 40,
        size: 10,
        font: helveticaFont,
        color: rgb(1, 1, 1), // White color for high contrast
      });

      return await pdfDoc.save();
    } catch (error) {
      console.error("Error generating certificate:", error);
      throw new Error("Failed to generate certificate");
    }
  }

  // Updated getTextWidth to be more accurate by accepting the font object
  private getTextWidth(text: string, font: PDFFont, fontSize: number): number {
    return font.widthOfTextAtSize(text, fontSize);
  }

  private splitTextIntoLines(text: string, maxCharsPerLine: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine + (currentLine ? " " : "") + word;

      if (testLine.length > maxCharsPerLine && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  generateCertificateFilename(courseName: string, studentName: string): string {
    const sanitize = (str: string) => str.replace(/[^a-z0-9]/gi, "_");
    return `certificate-${sanitize(courseName)}-${sanitize(studentName)}.pdf`;
  }
}
