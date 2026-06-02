import nodemailer from 'nodemailer';
import { MailtrapTransport } from 'mailtrap';

function createTransport() {
  if (process.env.MAILTRAP_TOKEN) {
    return nodemailer.createTransport(MailtrapTransport({ token: process.env.MAILTRAP_TOKEN }));
  }

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

export function hasEmailTransport(): boolean {
  return !!process.env.MAILTRAP_TOKEN || !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function getFromAddress(): { address: string; name: string } {
  const raw = process.env.SMTP_FROM ?? '';
  const match = raw.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (match) {
    return { name: match[1].trim() || 'MockFlow', address: match[2].trim() };
  }
  return { name: 'MockFlow', address: raw.trim() || 'hello@demomailtrap.co' };
}

export async function sendVerificationEmail({
  toEmail,
  userName,
  verificationToken,
}: {
  toEmail: string;
  userName: string;
  verificationToken: string;
}): Promise<void> {
  const appUrl = process.env.APP_URL ?? 'http://localhost:3001';
  const verifyUrl = `${appUrl}/auth/verify?token=${verificationToken}`;

  if (!hasEmailTransport()) {
    console.log(`[MockFlow] Email verification URL for ${toEmail}: ${verifyUrl}`);
    return;
  }

  const transport = createTransport();
  const from = getFromAddress();
  const usingMailtrapApi = !!process.env.MAILTRAP_TOKEN;

  console.log(`[MockFlow] Sending verification email`, {
    to: toEmail,
    from,
    transport: usingMailtrapApi ? 'mailtrap-api' : 'smtp',
  });

  const info = await transport.sendMail({
    from,
    to: toEmail,
    subject: 'Verify your MockFlow email address',
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
                <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Verify your email</p>
                <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">
                  Hi <strong style="color:#111827;">${userName}</strong>, click the button below to verify your email address.
                  This link expires in <strong style="color:#111827;">10 minutes</strong>.
                </p>

                <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                  <tr>
                    <td style="background:#2563eb;border-radius:8px;padding:12px 28px;">
                      <a href="${verifyUrl}" style="color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;display:block;">
                        Verify Email
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">Or copy and paste this link:</p>
                <p style="margin:0 0 24px;font-size:13px;color:#2563eb;word-break:break-all;">${verifyUrl}</p>

                <p style="margin:0;font-size:13px;color:#9ca3af;">
                  If you didn't create a MockFlow account, you can safely ignore this email.
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
    text: `Hi ${userName},\n\nVerify your MockFlow email: ${verifyUrl}\n\nThis link expires in 10 minutes.\n\nIf you didn't create a MockFlow account, ignore this email.`,
  });

  const transportInfo = info as unknown as Record<string, unknown>;
  console.log(`[MockFlow] Verification email sent to ${toEmail}`, {
    messageId: transportInfo.messageId,
    response: transportInfo.response,
    accepted: transportInfo.accepted,
    rejected: transportInfo.rejected,
  });
}

export async function sendPasswordResetEmail({
  toEmail,
  userName,
  resetToken,
}: {
  toEmail: string;
  userName: string;
  resetToken: string;
}): Promise<void> {
  const appUrl = process.env.APP_URL ?? 'http://localhost:3001';
  const resetUrl = `${appUrl}/auth/reset-password?token=${resetToken}`;

  if (!hasEmailTransport()) {
    console.log(`[MockFlow] Password reset URL for ${toEmail}: ${resetUrl}`);
    return;
  }

  const transport = createTransport();
  const from = getFromAddress();

  console.log(`[MockFlow] Sending password reset email to ${toEmail}`);

  await transport.sendMail({
    from,
    to: toEmail,
    subject: 'Reset your MockFlow password',
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
            <tr>
              <td style="background:#2563eb;padding:24px 32px;">
                <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">MockFlow</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Reset your password</p>
                <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">
                  Hi <strong style="color:#111827;">${userName}</strong>, click the button below to set a new password.
                  This link expires in <strong style="color:#111827;">1 hour</strong>.
                </p>

                <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                  <tr>
                    <td style="background:#2563eb;border-radius:8px;padding:12px 28px;">
                      <a href="${resetUrl}" style="color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;display:block;">
                        Reset Password
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">Or copy and paste this link:</p>
                <p style="margin:0 0 24px;font-size:13px;color:#2563eb;word-break:break-all;">${resetUrl}</p>

                <p style="margin:0;font-size:13px;color:#9ca3af;">
                  If you didn't request a password reset, you can safely ignore this email — your password won't change.
                </p>
              </td>
            </tr>
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
    text: `Hi ${userName},\n\nReset your MockFlow password: ${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.`,
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

  if (!hasEmailTransport()) {
    console.log(`[MockFlow] Invite URL for ${toEmail}: ${inviteUrl}`);
    return;
  }

  const transport = createTransport();

  await transport.sendMail({
    from: getFromAddress(),
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
