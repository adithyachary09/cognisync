import nodemailer from "nodemailer";

// 1. Setup Gmail Transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// 2. The "Bulletproof" Gen Z Template (Fixes Gmail "Suspicious" Warning)
// Uses tables for layout to ensure it renders correctly in all email clients.
const getEmailTemplate = (titleHtml: string, message: string, buttonText: string, link: string) => {
  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>CogniSync Notification</title>
  <style type="text/css">
    body, #bodyTable, #bodyCell { height:100% !important; margin:0; padding:0; width:100% !important; }
    table { border-collapse:collapse; }
    img, a img { border:0; outline:none; text-decoration:none; }
    h1, h2, h3, h4, h5, h6 { margin:0; padding:0; }
    p { margin: 1em 0; }
  </style>
</head>
<body style="background-color:#050505; margin:0; padding:0;">
  <center>
    <table border="0" cellpadding="0" cellspacing="0" height="100%" width="100%" style="background-color:#050505;">
      <tr>
        <td align="center" valign="top" id="bodyCell" style="padding: 40px 20px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:480px; background-color:#111111; border:1px solid #333333; border-radius:16px; overflow:hidden;">
            <tr>
              <td height="4" style="background-color: #3A86FF; background-image: linear-gradient(90deg, #3A86FF, #8338ec); font-size: 0; line-height: 0;">&nbsp;</td>
            </tr>
            <tr>
              <td align="center" valign="top" style="padding: 40px 30px;">
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 2px; color: #666666; text-transform: uppercase; margin-bottom: 24px;">
                  CogniSync Systems
                </div>
                
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 32px; font-weight: 800; line-height: 1.2; color: #ffffff; margin-bottom: 20px;">
                  ${titleHtml}
                </div>
                
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #a1a1aa; margin-bottom: 30px;">
                  ${message}
                </div>
                
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td align="center">
                      <a href="${link}" target="_blank" style="display: inline-block; padding: 16px 36px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: bold; color: #ffffff; text-decoration: none; background-color: #3A86FF; border-radius: 50px;">
                        ${buttonText} &rarr;
                      </a>
                    </td>
                  </tr>
                </table>
                
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.5; color: #444444; margin-top: 40px; border-top: 1px solid #222222; padding-top: 20px;">
                  Sent securely by CogniSync Support.<br/>
                  <span style="color: #333333;">If you didn't ask for this, honestly? Just ignore it.</span>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>
`;
};

// 3. Send Password Reset
export async function sendPasswordResetEmail(email: string, token: string) {
  const link = `http://localhost:3000/reset-password?token=${token}`;
  
  await transporter.sendMail({
    from: `"CogniSync Support" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Reset Credentials 🔑",
    html: getEmailTemplate(
      `Recovery Mode.`,
      `We received a request to reset your access credentials. Click below to set a new password.`,
      `Reset Password`,
      link
    ),
  });
}

// 4. Send Verification
export async function sendVerificationEmail(email: string, token: string) {
  console.log("🚀 SENDING VERIFICATION TO:", email);
  const link = `http://localhost:3000/settings?verified=true&token=${token}`;

  await transporter.sendMail({
    from: `"CogniSync Support" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Bringing care to your inbox❤️✨.  Please verify🎯",
    html: getEmailTemplate(
      `Let's get you <span style="color:#8338ec;">Synced.</span>`,
      `You're one tap away from unlocking the full CogniSync suite. Verify your email to secure your account. No cap.`,
      `Verify Me`,
      link
    ),
  });
}