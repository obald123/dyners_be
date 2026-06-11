import nodemailer from "nodemailer";
import { Resend } from "resend";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import type { CreateContactMessageInput } from "./contact.schemas";

function buildEmail(input: CreateContactMessageInput) {
  return {
    subject: `New enquiry from ${input.name}`,
    text: [
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      `Phone: ${input.phone ?? "-"}`,
      `Event Type: ${input.eventType ?? "-"}`,
      `Guests: ${input.guestCount ?? "-"}`,
      `Message:\n${input.message}`,
    ].join("\n"),
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
  if (!transport) return false;

  const { subject, text } = buildEmail(input);
  try {
    await transport.sendMail({
      from: `"Dyners Contact" <${env.GMAIL_USER}>`,
      to: env.CONTACT_TO_EMAIL,
      replyTo: input.email,
      subject,
      text,
    });
    return true;
  } catch (err) {
    logger.warn({ err }, "gmail smtp send failed — trying resend fallback");
    return false;
  }
}

async function sendViaResend(input: CreateContactMessageInput): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false;

  const { subject, text } = buildEmail(input);
  try {
    const resend = new Resend(env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Dyners Contact <onboarding@resend.dev>",
      to: env.CONTACT_TO_EMAIL,
      replyTo: input.email,
      subject,
      text,
    });
    return true;
  } catch (err) {
    logger.warn({ err }, "resend send failed");
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
