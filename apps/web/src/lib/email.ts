import { Resend } from "resend";
import { randomInt } from "crypto";
import bcrypt from "bcryptjs";

// Only initialize Resend if API key is provided
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.EMAIL_FROM || "Codeusage <noreply@codeusage.dev>";
const ADMIN_EMAIL = "info@codeusage.dev";

// Dev mode: skip email sending and log OTP to console
const DEV_MODE = !process.env.RESEND_API_KEY;

/**
 * Generate a cryptographically secure 6-digit OTP
 * Uses crypto.randomInt which is suitable for security-critical operations
 */
export function generateOTP(): string {
  // randomInt is cryptographically secure, unlike Math.random()
  return randomInt(100000, 1000000).toString();
}

/**
 * Hash OTP for secure storage (never store plaintext OTPs)
 * Uses bcrypt with cost factor 10
 */
export async function hashOTP(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10);
}

/**
 * Verify OTP using constant-time comparison
 * Returns true if OTP matches, false otherwise
 */
export async function verifyOTP(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}

export async function sendOTPEmail(email: string, otp: string): Promise<{ success: boolean; error?: string }> {
  // In dev mode or without Resend API key, just log to console
  if (DEV_MODE || !resend) {
    console.log("\n========================================");
    console.log(`📧 OTP for ${email}: ${otp}`);
    console.log("========================================\n");
    return { success: true };
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Your Codeusage verification code",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #fafafa; padding: 40px 20px; margin: 0;">
            <div style="max-width: 400px; margin: 0 auto; text-align: center;">
              <div style="margin-bottom: 32px;">
                <div style="display: inline-flex; align-items: center; gap: 10px;">
                  <img src="https://codeusage.dev/brand/codeusage-logo.svg" alt="Codeusage" width="36" height="36" style="display: inline-block; vertical-align: middle;" />
                  <span style="font-size: 20px; font-weight: 600; color: #D97757;">Codeusage</span>
                </div>
              </div>

              <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 8px 0;">Verification code</h1>
              <p style="color: #a1a1aa; margin: 0 0 24px 0;">Enter this code to sign in to Codeusage</p>

              <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: monospace;">
                  ${otp}
                </div>
              </div>

              <p style="color: #71717a; font-size: 14px; margin: 0;">
                This code expires in 5 minutes.<br>
                If you didn't request this, you can safely ignore this email.
              </p>
            </div>
          </body>
        </html>
      `,
      text: `Your Codeusage verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you didn't request this, you can safely ignore this email.`,
    });

    if (error) {
      console.error("Failed to send email:", error);
      // In case of email failure, log to console so testing can continue
      console.log("\n========================================");
      console.log(`📧 OTP for ${email}: ${otp} (email failed, logged for testing)`);
      console.log("========================================\n");
      return { success: true }; // Don't block the flow
    }

    return { success: true };
  } catch (err) {
    console.error("Email sending error:", err);
    // Log OTP to console so testing can continue
    console.log("\n========================================");
    console.log(`📧 OTP for ${email}: ${otp} (email failed, logged for testing)`);
    console.log("========================================\n");
    return { success: true }; // Don't block the flow
  }
}

export async function sendInvitationEmail(
  email: string,
  workspaceName: string,
  inviterName: string | null,
  role: string,
  inviteUrl: string
): Promise<{ success: boolean; error?: string }> {
  const inviter = inviterName || "A team member";

  if (DEV_MODE || !resend) {
    console.log("\n========================================");
    console.log(`📧 Invitation email for ${email}`);
    console.log(`   Workspace: ${workspaceName}`);
    console.log(`   Invited by: ${inviter}`);
    console.log(`   Role: ${role}`);
    console.log(`   URL: ${inviteUrl}`);
    console.log("========================================\n");
    return { success: true };
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `You're invited to join ${workspaceName} on Codeusage`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #fafafa; padding: 40px 20px; margin: 0;">
            <div style="max-width: 480px; margin: 0 auto;">
              <div style="text-align: center; margin-bottom: 32px;">
                <div style="display: inline-flex; align-items: center; gap: 10px;">
                  <img src="https://codeusage.dev/brand/codeusage-logo.svg" alt="Codeusage" width="36" height="36" style="display: inline-block; vertical-align: middle;" />
                  <span style="font-size: 20px; font-weight: 600; color: #D97757;">Codeusage</span>
                </div>
              </div>

              <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">You're invited!</h1>

              <p style="color: #d4d4d8; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
                ${inviter} has invited you to join <strong>${workspaceName}</strong> as a <strong style="text-transform: capitalize;">${role}</strong>.
              </p>

              <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
                <p style="color: #a1a1aa; font-size: 14px; margin: 0 0 16px 0;">
                  Codeusage helps teams track AI coding tool usage across projects.
                </p>
                <a href="${inviteUrl}" style="display: inline-block; background-color: #D97757; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 32px; border-radius: 8px;">
                  Accept Invitation
                </a>
              </div>

              <p style="color: #71717a; font-size: 13px; text-align: center; margin: 0 0 8px 0;">
                This invitation expires in 7 days.
              </p>
              <p style="color: #71717a; font-size: 13px; text-align: center; margin: 0;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </div>
          </body>
        </html>
      `,
      text: `You're invited to join ${workspaceName} on Codeusage!\n\n${inviter} has invited you to join as a ${role}.\n\nAccept invitation: ${inviteUrl}\n\nThis invitation expires in 7 days.\n\nIf you didn't expect this invitation, you can safely ignore this email.`,
    });

    if (error) {
      console.error("Failed to send invitation email:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Invitation email sending error:", err);
    return { success: false, error: (err as Error).message };
  }
}

export async function sendWelcomeEmail(email: string, displayName: string): Promise<{ success: boolean; error?: string }> {
  if (DEV_MODE || !resend) {
    console.log("\n========================================");
    console.log(`📧 Welcome email for ${email} (${displayName})`);
    console.log("========================================\n");
    return { success: true };
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Welcome to Codeusage",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #fafafa; padding: 40px 20px; margin: 0;">
            <div style="max-width: 480px; margin: 0 auto;">
              <div style="text-align: center; margin-bottom: 32px;">
                <div style="display: inline-flex; align-items: center; gap: 10px;">
                  <img src="https://codeusage.dev/brand/codeusage-logo.svg" alt="Codeusage" width="36" height="36" style="display: inline-block; vertical-align: middle;" />
                  <span style="font-size: 20px; font-weight: 600; color: #D97757;">Codeusage</span>
                </div>
              </div>

              <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">Welcome to Codeusage!</h1>

              <p style="color: #d4d4d8; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Hi ${displayName}, thanks for signing up. Codeusage gives your team visibility into how AI coding tools are used across your projects.
              </p>

              <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h2 style="font-size: 16px; font-weight: 600; margin: 0 0 16px 0;">Get started in 2 steps:</h2>
                <div style="margin-bottom: 12px;">
                  <span style="color: #D97757; font-weight: 600;">1.</span>
                  <span style="color: #d4d4d8;"> Install the CLI</span>
                  <div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 8px; padding: 12px; margin-top: 8px; font-family: monospace; font-size: 14px; color: #a1a1aa;">
                    bun add -g codeusage-cli
                  </div>
                </div>
                <div>
                  <span style="color: #D97757; font-weight: 600;">2.</span>
                  <span style="color: #d4d4d8;"> Connect to your workspace</span>
                  <div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 8px; padding: 12px; margin-top: 8px; font-family: monospace; font-size: 14px; color: #a1a1aa;">
                    codeusage init
                  </div>
                </div>
              </div>

              <div style="text-align: center; margin-bottom: 24px;">
                <a href="https://codeusage.dev/docs" style="display: inline-block; background-color: #D97757; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 8px;">
                  View Documentation
                </a>
              </div>

              <p style="color: #71717a; font-size: 13px; text-align: center; margin: 0;">
                You're receiving this because you signed up for Codeusage.<br>
                Need help? Reply to this email.
              </p>
            </div>
          </body>
        </html>
      `,
      text: `Welcome to Codeusage!\n\nHi ${displayName}, thanks for signing up. Codeusage gives your team visibility into how AI coding tools are used across your projects.\n\nGet started:\n1. Install the CLI: bun add -g codeusage-cli\n2. Connect to your workspace: codeusage init\n\nDocumentation: https://codeusage.dev/docs\n\nNeed help? Reply to this email.`,
    });

    if (error) {
      console.error("Failed to send welcome email:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Welcome email sending error:", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Send admin notification when a new user registers
 * This helps track signups before admin panel is built
 */
export async function sendNewUserNotification(
  userEmail: string,
  userName: string | null,
  signupMethod: "email" | "github"
): Promise<{ success: boolean; error?: string }> {
  const timestamp = new Date().toISOString();

  if (DEV_MODE || !resend) {
    console.log("\n========================================");
    console.log(`🎉 NEW USER REGISTERED`);
    console.log(`   Email: ${userEmail}`);
    console.log(`   Name: ${userName || "Not provided"}`);
    console.log(`   Method: ${signupMethod}`);
    console.log(`   Time: ${timestamp}`);
    console.log("========================================\n");
    return { success: true };
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `New Codeusage signup: ${userEmail}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; margin: 0;">
            <h2 style="color: #D97757; margin: 0 0 20px 0;">🎉 New User Registered</h2>

            <table style="border-collapse: collapse; width: 100%; max-width: 400px;">
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: 600;">Email</td>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${userEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: 600;">Name</td>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${userName || "Not provided"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: 600;">Signup Method</td>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb; text-transform: capitalize;">${signupMethod}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: 600;">Time</td>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${timestamp}</td>
              </tr>
            </table>
          </body>
        </html>
      `,
      text: `New Codeusage User Registered\n\nEmail: ${userEmail}\nName: ${userName || "Not provided"}\nSignup Method: ${signupMethod}\nTime: ${timestamp}`,
    });

    if (error) {
      console.error("Failed to send admin notification:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Admin notification error:", err);
    return { success: false, error: (err as Error).message };
  }
}
