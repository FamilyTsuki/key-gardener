const nodemailer = require('nodemailer');

let testAccount = null;
let transporter = null;

async function initMailer() {
    if (!transporter) {
        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT || 587,
                secure: process.env.SMTP_PORT == 465,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
            console.log("Real SMTP email account initialized.");
        } else {
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
}

async function sendResetCodeEmail(toEmail, resetCode) {
    await initMailer();

    // Generate the reset link based on the token (resetCode parameter acts as the token)
    const resetLink = `http://localhost:5000/login?reset_token=${resetCode}&email=${encodeURIComponent(toEmail)}`;

    const info = await transporter.sendMail({
        from: process.env.EMAIL_SENDER || '"Keyboard Survivor" <alban.elie590@gmail.com>',
        to: toEmail,
        subject: "Keyboard Survivor - Réinitialisation de votre mot de passe",
        text: `Vous avez demandé la réinitialisation de votre mot de passe.\n\nCliquez sur ce lien pour choisir un nouveau mot de passe :\n${resetLink}\n\nCe lien expire dans 10 minutes.`,
        html: `<h2>Réinitialisation de mot de passe</h2><p>Vous avez demandé la réinitialisation de votre mot de passe.</p><p><a href="${resetLink}">Cliquez ici pour choisir un nouveau mot de passe</a></p><p>Ce lien expire dans 10 minutes.</p>`,
    });

    console.log("Message sent: %s", info.messageId);
    if (!process.env.SMTP_HOST) {
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        return nodemailer.getTestMessageUrl(info);
    }
    return true;
}

module.exports = {
    sendResetCodeEmail
};
