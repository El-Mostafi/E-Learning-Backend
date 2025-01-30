import nodemailer from "nodemailer";

export class EmailSenderService {
  public readonly transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "helpdesk.elearningapp@gmail.com",
      pass: "pdyh dpib wibh jfxd",
    },
  });
  constructor() {}

  async sendEmail(email: string, subject: string, html: string) {
    const mailOptions = {
      from: "helpdesk.elearningapp@gmail.com",
      to: email,
      subject: subject,
      html: html,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log("Email sent:", info.messageId);
    } catch (error) {
      console.error("Error sending email:", error);
    }
  }
}

export const emailSenderService = new EmailSenderService();
