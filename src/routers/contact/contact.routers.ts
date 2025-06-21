import { Router, Request, Response, NextFunction } from 'express';
import { nextLine } from 'pdf-lib';
import { contactFormService } from '../../service/contact/contact.service';

// 1. Import the new service we just created


const router = Router();

router.post('/api/contact', async (req: Request, res: Response, next: NextFunction) => {
  // 2. The router's job is to get the data from the web request
  const { name, email, subject, message, number } = req.body;

  // 3. And perform basic validation
  if (!name || !email || !subject || !message) {
    return next(new Error('All fields are required.'));
  }

  try {
    // 4. Pass the validated data to the service layer.
    //    The router doesn't care HOW the email is sent.
    await contactFormService.handleContactSubmission({
      name,
      email,
      subject,
      message,
      number,
    });

    // 5. If the service succeeds, send a success response
    res.status(200).json({ message: 'Message sent successfully!' });
  } catch (error) {
    // 6. If the service fails, send a server error response
    console.error('Contact form submission failed:', error);
    res.status(500).json({ message: 'An error occurred while sending the message.' });
  }
});

export { router as contactRouters };