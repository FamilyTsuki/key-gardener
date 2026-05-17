const nodemailer = require('nodemailer');

let testAccount = null;
let transporter = null;

async function initMailer() {
    if (!transporter) {
        testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
        console.log("Ethereal test email account initialized.");
    }
}

async function sendResetCodeEmail(toEmail, resetCode) {
    await initMailer();

    const info = await transporter.sendMail({
        from: process.env.EMAIL_SENDER || '"Keyboard Survivor" <alban.elie590@gmail.com>',
        to: toEmail,
        subject: "Your Password Reset Code",
        text: `Your password reset code is: ${resetCode}. It will expire in 10 minutes.`,
        html: `<b>Your password reset code is:</b> <h2>${resetCode}</h2><br/><p>It will expire in 10 minutes.</p>`,
    });

    console.log("Message sent: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    
    return nodemailer.getTestMessageUrl(info);
}

module.exports = {
    sendResetCodeEmail
};
