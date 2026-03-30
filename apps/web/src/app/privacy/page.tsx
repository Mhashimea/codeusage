import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CodeusageLogoBrand } from "@/components/shared/CodeusageLogo";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to home</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-3 mb-8">
          <CodeusageLogoBrand size={32} />
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
        </div>

        <p className="text-muted-foreground mb-8">
          Last updated: March 26, 2026
        </p>

        <div className="prose prose-invert prose-gray max-w-none space-y-8">
          {/* Section 1 */}
          <section>
            <h2 className="text-xl font-semibold mb-4">1. Information We Collect</h2>
            <p className="text-muted-foreground mb-4">
              Codeusage collects minimal data necessary to provide our service:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Account Information:</strong> Email address and name when you create an account
              </li>
              <li>
                <strong className="text-foreground">Usage Metadata:</strong> Token counts, model names, task durations, and cost estimates from your AI coding tool sessions
              </li>
              <li>
                <strong className="text-foreground">Technical Data:</strong> CLI version, timestamp of tasks, and project identifiers
              </li>
            </ul>
            <p className="text-muted-foreground mt-4">
              <strong className="text-foreground">Important:</strong> We never collect prompt content, code, file contents, or any sensitive data from your AI coding sessions. Only metadata is transmitted.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl font-semibold mb-4">2. How We Use Your Information</h2>
            <p className="text-muted-foreground mb-4">
              We use collected information to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Provide usage analytics and cost tracking in your dashboard</li>
              <li>Authenticate your CLI and web sessions</li>
              <li>Improve our service and fix issues</li>
              <li>Communicate important service updates</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl font-semibold mb-4">3. Data Storage</h2>
            <p className="text-muted-foreground">
              Your data is stored securely using industry-standard practices. We use PostgreSQL databases hosted on secure cloud infrastructure with encryption at rest and in transit. Access to data is restricted and logged.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-semibold mb-4">4. Third-Party Services</h2>
            <p className="text-muted-foreground mb-4">
              We use the following third-party services:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Vercel:</strong> Application hosting and deployment</li>
              <li><strong className="text-foreground">Neon/Supabase:</strong> Database hosting</li>
              <li><strong className="text-foreground">Resend:</strong> Transactional email delivery</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl font-semibold mb-4">5. Data Retention</h2>
            <p className="text-muted-foreground">
              Your data is retained while your account is active. You may request deletion of your account and associated data at any time by contacting us. Upon account deletion, all your data will be permanently removed within 30 days.
            </p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl font-semibold mb-4">6. Cookies</h2>
            <p className="text-muted-foreground">
              We use essential cookies for authentication and session management. We do not use third-party tracking cookies or analytics that track your behavior across other websites.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl font-semibold mb-4">7. Your Rights</h2>
            <p className="text-muted-foreground mb-4">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Access the data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data in a portable format</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-xl font-semibold mb-4">8. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this privacy policy from time to time. We will notify you of any significant changes by posting a notice on our website or sending you an email.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-xl font-semibold mb-4">9. Contact</h2>
            <p className="text-muted-foreground">
              If you have any questions about this privacy policy, please contact us at{" "}
              <a
                href="mailto:info@codeusage.dev"
                className="text-[#D97757] hover:underline"
              >
                info@codeusage.dev
              </a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Codeusage. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
