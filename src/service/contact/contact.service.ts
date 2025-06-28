// 1. Import your existing, core email sending service
//    (Adjust the path to where your service is located)

import { emailSenderService } from "../EmailSender.service";


// 2. Define an interface for the data our service will receive
interface IContactFormData {
  name: string;
  email: string; // This is the user's email from the form
  subject: string;
  message: string;
  number?: string;
}

/**
 * Handles the business logic for a contact form submission.
 * @param formData The validated data from the contact form.
 */
const handleContactSubmission = async (formData: IContactFormData): Promise<void> => {
  // 3. Get the recipient email address from environment variables
  const recipientEmail = process.env.EMAIL_TO;

  if (!recipientEmail) {
    // This is a server configuration error, so we throw an error
    console.error('FATAL: EMAIL_TO environment variable is not set.');
    throw new Error('Server is not configured to send emails.');
  }

  // 4. Prepare the arguments for your existing emailSenderService
  const emailSubject = `New Contact Form Message: ${formData.subject}`;

const htmlContent = `
    <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 32px;">
        <div style="max-width: 600px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); padding: 32px;">
            <h1 style="color: #2c3e50; border-bottom: 2px solid #e1e1e1; padding-bottom: 12px;">📬 New Contact Form Submission</h1>
            <table style="width: 100%; margin-top: 24px; margin-bottom: 24px; font-size: 16px;">
                <tr>
                    <td style="font-weight: bold; padding: 8px 0;">Name:</td>
                    <td>${formData.name}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 8px 0;">Email:</td>
                    <td><a href="mailto:${formData.email}" style="color: #2980b9;">${formData.email}</a></td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 8px 0;">Phone:</td>
                    <td>${formData.number || '<span style="color:#aaa;">Not provided</span>'}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 8px 0;">Subject:</td>
                    <td>${formData.subject}</td>
                </tr>
            </table>
            <div style="background: #f4f8fb; border-left: 4px solid #2980b9; padding: 16px 20px; border-radius: 4px;">
                <h2 style="margin-top: 0; color: #2980b9;">Message</h2>
                <p style="white-space: pre-line; color: #333;">${formData.message}</p>
            </div>
            <p style="margin-top: 32px; color: #888; font-size: 13px; text-align: center;">
                This message was sent from your website contact form.
            </p>
        </div>
    </div>
`;

  // 5. Call your core email service with the prepared data
  // console.log(`Preparing to send email to ${recipientEmail}...`);
  await emailSenderService.sendEmail(recipientEmail, emailSubject, htmlContent);
  // console.log('Email handover to emailSenderService was successful.');
};

// 6. Export the function so the router can use it
export const contactFormService = {
  handleContactSubmission,
};