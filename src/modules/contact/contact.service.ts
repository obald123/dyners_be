import nodemailer from "nodemailer";
import { Resend } from "resend";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import type { CreateContactMessageInput } from "./contact.schemas";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const eventTypeLabels: Record<string, string> = {
  catering: "Catering",
  planning: "Event Planning",
  rentals: "Rentals",
};

function buildEmail(input: CreateContactMessageInput) {
  const eventType = input.eventType ? (eventTypeLabels[input.eventType] ?? input.eventType) : null;

  const detailRows = [
    ["Name", input.name],
    ["Email", input.email],
    ["Phone", input.phone],
    ["Event type", eventType],
    ["Guests", input.guestCount],
  ]
    .filter((row): row is [string, string] => Boolean(row[1]))
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:9px 0;font-size:12px;color:#8a8a8a;width:110px;vertical-align:top;border-bottom:1px solid #f0ede6;">${label}</td>
          <td style="padding:9px 0;font-size:14px;color:#111111;font-weight:600;border-bottom:1px solid #f0ede6;">${
            label === "Email"
              ? `<a href="mailto:${escapeHtml(value)}" style="color:#29452f;text-decoration:none;">${escapeHtml(value)}</a>`
              : escapeHtml(value)
          }</td>
        </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#f4f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f0;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
            <!-- Header -->
            <tr>
              <td style="padding:0 8px 18px;">
                <span style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-weight:bold;font-size:26px;color:#29452f;">Dyner's</span>
                <span style="font-size:12px;color:#8a8a8a;padding-left:10px;">New enquiry from the website</span>
              </td>
            </tr>
            <!-- Card -->
            <tr>
              <td style="background-color:#ffffff;border-radius:12px;padding:28px 32px;border-top:4px solid #29452f;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${detailRows}
                </table>
                <p style="margin:22px 0 8px;font-size:12px;color:#8a8a8a;">Message</p>
                <div style="background-color:#fafaf8;border-radius:8px;padding:16px 18px;font-size:14px;line-height:1.6;color:#333333;">
                  ${escapeHtml(input.message).replace(/\n/g, "<br/>")}
                </div>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                  <tr>
                    <td style="background-color:#29452f;border-radius:6px;">
                      <a href="mailto:${escapeHtml(input.email)}?subject=Re:%20Your%20enquiry%20to%20Dyners"
                         style="display:inline-block;padding:11px 26px;font-size:13px;font-weight:bold;color:#ffffff;text-decoration:none;">
                        Reply to ${escapeHtml(input.name.split(" ")[0] ?? input.name)}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="padding:18px 8px 0;text-align:center;">
                <p style="margin:0;font-size:11px;color:#a8a8a8;">Sent automatically from the dyners.rw contact form</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    subject: `New enquiry from ${input.name}`,
    text: [
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      `Phone: ${input.phone ?? "-"}`,
      `Event Type: ${eventType ?? "-"}`,
      `Guests: ${input.guestCount ?? "-"}`,
      `Message:\n${input.message}`,
    ].join("\n"),
    html,
  };
}

let gmailTransport: nodemailer.Transporter | null = null;

function getGmailTransport(): nodemailer.Transporter | null {
  if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) return null;
  gmailTransport ??= nodemailer.createTransport({
    service: "gmail",
    // Google shows app passwords grouped with spaces — strip them.
    auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD.replace(/\s+/g, "") },
  });
  return gmailTransport;
}

async function sendViaGmail(input: CreateContactMessageInput): Promise<boolean> {
  const transport = getGmailTransport();
  if (!transport) {
    logger.info("contact email: gmail not configured (GMAIL_USER / GMAIL_APP_PASSWORD missing)");
    return false;
  }

  const { subject, text, html } = buildEmail(input);
  try {
    const info = await transport.sendMail({
      from: `"Dyners Contact" <${env.GMAIL_USER}>`,
      to: env.CONTACT_TO_EMAIL,
      replyTo: input.email,
      subject,
      text,
      html,
    });
    logger.info(
      { messageId: info.messageId, to: env.CONTACT_TO_EMAIL, accepted: info.accepted },
      "contact email sent via gmail"
    );
    return true;
  } catch (err) {
    logger.error({ err }, "contact email: gmail smtp send FAILED — trying resend fallback");
    return false;
  }
}

async function sendViaResend(input: CreateContactMessageInput): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false;

  const { subject, text, html } = buildEmail(input);
  try {
    const resend = new Resend(env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: "Dyners Contact <onboarding@resend.dev>",
      to: env.CONTACT_TO_EMAIL,
      replyTo: input.email,
      subject,
      text,
      html,
    });
    if (error) throw new Error(error.message);
    logger.info({ id: data?.id, to: env.CONTACT_TO_EMAIL }, "contact email sent via resend");
    return true;
  } catch (err) {
    logger.error({ err }, "contact email: resend send FAILED");
    return false;
  }
}

/**
 * Sends the notification email — Gmail SMTP first, Resend as fallback.
 * Best-effort: the message is already stored in the database, so an email
 * outage must never fail the request.
 */
export async function notifyByEmail(input: CreateContactMessageInput): Promise<void> {
  if (await sendViaGmail(input)) return;
  if (await sendViaResend(input)) return;
  if (!env.GMAIL_USER && !env.RESEND_API_KEY) {
    logger.info("contact email skipped — no GMAIL_USER or RESEND_API_KEY configured");
  } else {
    logger.error("contact notification email failed on all providers");
  }
}
