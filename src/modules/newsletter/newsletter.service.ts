import nodemailer from "nodemailer";
import { Resend } from "resend";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";

function buildWelcomeEmail(email: string) {
  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#f4f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f0;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
            <tr>
              <td style="padding:0 8px 18px;">
                <span style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-weight:bold;font-size:26px;color:#29452f;">Dyner's</span>
              </td>
            </tr>
            <tr>
              <td style="background-color:#ffffff;border-radius:12px;padding:32px;border-top:4px solid #29452f;">
                <h1 style="margin:0 0 12px;font-size:22px;color:#111111;">Welcome to Dyner's!</h1>
                <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#555555;">
                  Thank you for subscribing to our newsletter. You'll now receive updates on our latest
                  catering menus, event planning tips, rental packages, and exclusive offers.
                </p>
                <p style="margin:0 0 4px;font-size:14px;line-height:1.6;color:#555555;">
                  We'll send updates to <strong>${email}</strong>.
                </p>
                <p style="margin:0 0 4px;font-size:14px;line-height:1.6;color:#555555;">
                  We're excited to have you with us!
                </p>
                <p style="margin:0;font-size:14px;color:#555555;">— The Dyner's Team</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 8px 0;text-align:center;">
                <p style="margin:0;font-size:11px;color:#a8a8a8;">
                  You received this because you subscribed at dyners.rw.
                  If you didn't subscribe, please ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    subject: "Welcome to Dyner's Newsletter!",
    text: `Welcome to Dyner's!\n\nThank you for subscribing to our newsletter. You'll now receive updates on our latest catering menus, event planning tips, rental packages, and exclusive offers.\n\nWe'll send updates to ${email}.\n\nWe're excited to have you with us!\n\n— The Dyner's Team`,
    html,
  };
}

function buildAdminNotification(email: string) {
  return {
    subject: `New newsletter subscriber: ${email}`,
    text: `New newsletter subscriber:\n\nEmail: ${email}`,
    html: `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#f4f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f0;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr><td style="background-color:#ffffff;border-radius:12px;padding:28px 32px;border-top:4px solid #29452f;">
            <p style="margin:0;font-size:14px;color:#111111;font-weight:600;">New newsletter subscriber</p>
            <p style="margin:12px 0 0;font-size:14px;color:#555555;">
              <a href="mailto:${email}" style="color:#29452f;">${email}</a>
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`,
  };
}

let gmailTransport: nodemailer.Transporter | null = null;

function getGmailTransport(): nodemailer.Transporter | null {
  if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) return null;
  gmailTransport ??= nodemailer.createTransport({
    service: "gmail",
    auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD.replace(/\s+/g, "") },
  });
  return gmailTransport;
}

async function sendViaGmail(to: string, subject: string, text: string, html: string, replyTo?: string): Promise<boolean> {
  const transport = getGmailTransport();
  if (!transport) return false;

  try {
    const info = await transport.sendMail({
      from: `"Dyners" <${env.GMAIL_USER}>`,
      to,
      replyTo,
      subject,
      text,
      html,
    });
    logger.info({ messageId: info.messageId, to }, "newsletter email sent via gmail");
    return true;
  } catch (err) {
    logger.error({ err }, "newsletter email: gmail failed");
    return false;
  }
}

async function sendViaResend(to: string, subject: string, text: string, html: string, replyTo?: string): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false;
  try {
    const resend = new Resend(env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: "Dyners <onboarding@resend.dev>",
      to,
      replyTo,
      subject,
      text,
      html,
    });
    if (error) throw new Error(error.message);
    logger.info({ id: data?.id, to }, "newsletter email sent via resend");
    return true;
  } catch (err) {
    logger.error({ err }, "newsletter email: resend failed");
    return false;
  }
}

async function sendEmail(to: string, subject: string, text: string, html: string, replyTo?: string): Promise<void> {
  if (await sendViaGmail(to, subject, text, html, replyTo)) return;
  if (await sendViaResend(to, subject, text, html, replyTo)) return;
  if (!env.GMAIL_USER && !env.RESEND_API_KEY) {
    logger.info("newsletter email skipped — no GMAIL_USER or RESEND_API_KEY configured");
  } else {
    logger.error("newsletter email failed on all providers");
  }
}

export async function sendWelcomeEmail(email: string): Promise<void> {
  const { subject, text, html } = buildWelcomeEmail(email);
  await sendEmail(email, subject, text, html);
}

export async function notifyAdminOfNewSubscriber(email: string, adminEmail: string): Promise<void> {
  const { subject, text, html } = buildAdminNotification(email);
  await sendEmail(adminEmail, subject, text, html);
}

function buildCampaignEmail(subject: string, bodyHtml: string) {
  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#f4f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f0;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
            <tr>
              <td style="padding:0 8px 18px;">
                <span style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-weight:bold;font-size:26px;color:#29452f;">Dyner's</span>
              </td>
            </tr>
            <tr>
              <td style="background-color:#ffffff;border-radius:12px;padding:32px;border-top:4px solid #29452f;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 8px 0;text-align:center;">
                <p style="margin:0;font-size:11px;color:#a8a8a8;">
                  You received this because you subscribed at dyners.rw.
                  If you no longer wish to receive these emails, please contact us.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  const text = bodyHtml.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return { subject, text, html };
}

export async function sendCampaignEmail(to: string, subject: string, bodyHtml: string): Promise<void> {
  const mail = buildCampaignEmail(subject, bodyHtml);
  await sendEmail(to, mail.subject, mail.text, mail.html);
}
