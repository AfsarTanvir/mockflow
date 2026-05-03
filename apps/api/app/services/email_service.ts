import nodemailer from 'nodemailer';

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.mailtrap.io',
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
}

export async function sendInviteEmail({
  toEmail,
  inviterName,
  projectName,
  role,
  inviteToken,
}: {
  toEmail: string;
  inviterName: string;
  projectName: string;
  role: string;
  inviteToken: string;
}): Promise<void> {
  const appUrl = process.env.APP_URL ?? 'http://localhost:3001';
  const inviteUrl = `${appUrl}/invite/${inviteToken}`;

  const transport = createTransport();

  await transport.sendMail({
    from: process.env.SMTP_FROM ?? '"MockFlow" <noreply@mockflow.dev>',
    to: toEmail,
    subject: `${inviterName} invited you to ${projectName} on MockFlow`,
    html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
      <tr>
        <td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden;">
            <!-- Header -->
            <tr>
              <td style="background:#2563eb;padding:24px 32px;">
                <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">MockFlow</p>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">You've been invited!</p>
                <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">
                  <strong style="color:#111827;">${inviterName}</strong> has invited you to join
                  <strong style="color:#111827;">${projectName}</strong> as a
                  <strong style="color:#111827;text-transform:capitalize;">${role}</strong>.
                </p>

                <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                  <tr>
                    <td style="background:#2563eb;border-radius:8px;padding:12px 28px;">
                      <a href="${inviteUrl}" style="color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;display:block;">
                        Accept Invitation
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">Or copy and paste this link:</p>
                <p style="margin:0 0 24px;font-size:13px;color:#2563eb;word-break:break-all;">${inviteUrl}</p>

                <p style="margin:0;font-size:13px;color:#9ca3af;">
                  This invite was sent to <strong>${toEmail}</strong>. If you weren't expecting this, you can ignore this email.
                </p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="padding:16px 32px;border-top:1px solid #f4f4f5;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">MockFlow · Mock API platform</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    text: `${inviterName} invited you to join ${projectName} as ${role} on MockFlow.\n\nAccept the invitation: ${inviteUrl}\n\nThis invite was sent to ${toEmail}.`,
  });
}
