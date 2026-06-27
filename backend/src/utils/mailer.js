const nodemailer = require('nodemailer');

let testAccount = null;
let transporter = null;

/**
 * Inits the mailer.
 */
async function initMailer() {
    if (!transporter) {
        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT, 10),
                secure: parseInt(process.env.SMTP_PORT, 10) === 465,
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

/**
 * Sends the reset code email.
 * @param {any} toEmail - The toEmail.
 * @param {any} resetCode - The resetCode.
 */
async function sendResetCodeEmail(toEmail, resetCode) {
    await initMailer();

    const baseUrl = process.env.FRONTEND_URL;
    const resetLink = `${baseUrl}/login?reset_token=${resetCode}&email=${encodeURIComponent(toEmail)}`;

    const gameName = process.env.GAME_NAME;
    const emailSender = process.env.EMAIL_SENDER.replace(/Keyboard Survivor/g, gameName);

    const info = await transporter.sendMail({
        from: emailSender,
        to: toEmail,
        subject: gameName 
            ? `${gameName} - Password Reset / Réinitialisation de mot de passe`
            : "Password Reset / Réinitialisation de mot de passe",
        text: `You have requested to reset your password.\nClick on this link to choose a new password:\n${resetLink}\nThis link will expire in 10 minutes.\n\n---\n\nVous avez demandé la réinitialisation de votre mot de passe.\nCliquez sur ce lien pour choisir un nouveau mot de passe :\n${resetLink}\nCe lien expire dans 10 minutes.`,
        html: `<h2>Password Reset / Réinitialisation de mot de passe</h2>
<p>You have requested to reset your password. / Vous avez demandé la réinitialisation de votre mot de passe.</p>
<p><a href="${resetLink}">Click here to choose a new password / Cliquez ici pour choisir un nouveau mot de passe</a></p>
<p>This link will expire in 10 minutes. / Ce lien expire dans 10 minutes.</p>`,
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
