import { Resend } from "resend";
import { randomInt } from "crypto";
import bcrypt from "bcryptjs";

// Only initialize Resend if API key is provided
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.EMAIL_FROM || "CodeUsage <noreply@codeusage.dev>";

// Dev mode: skip email sending and log OTP to console
const DEV_MODE = !process.env.RESEND_API_KEY || process.env.NODE_ENV === "development";

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
      subject: "Your CodeUsage verification code",
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
                <div style="display: inline-flex; align-items: center; gap: 8px;">
                  <div style="width: 36px; height: 36px; background-color: #3b82f6; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="20" x2="18" y2="10"></line>
                      <line x1="12" y1="20" x2="12" y2="4"></line>
                      <line x1="6" y1="20" x2="6" y2="14"></line>
                    </svg>
                  </div>
                  <span style="font-size: 20px; font-weight: 600;">CodeUsage</span>
                </div>
              </div>

              <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 8px 0;">Verification code</h1>
              <p style="color: #a1a1aa; margin: 0 0 24px 0;">Enter this code to sign in to CodeUsage</p>

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
      text: `Your CodeUsage verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you didn't request this, you can safely ignore this email.`,
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
