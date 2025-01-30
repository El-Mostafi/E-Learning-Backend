import nodemailer from 'nodemailer';

export class EmailSenderService {
    public readonly transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'simo.moustfi75@gmail.com', 
            pass: 'kgdj qmxh qezw gupw', 
        },
    });
    constructor(
    ) {}

    async sendEmail(email: string, subject: string, html: string) {
        const mailOptions = {
            from: 'simo.moustfi75@gmail.com', 
            to: email, 
            subject: subject, 
            html: html, 
        };
    
        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('Email sent:', info.messageId);
        } catch (error) {
            console.error('Error sending email:', error);
        }
    }
    
    

    
    

}

export const emailSenderService = new EmailSenderService()