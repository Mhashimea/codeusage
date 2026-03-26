import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CodeUsageLogoBrand } from "@/components/shared/CodeUsageLogo";

export default function TermsPage() {
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
          <CodeUsageLogoBrand size={32} />
          <h1 className="text-3xl font-bold">Terms of Service</h1>
        </div>

        <p className="text-muted-foreground mb-8">
          Last updated: March 26, 2026
        </p>

        <div className="prose prose-invert prose-gray max-w-none space-y-8">
          {/* Section 1 */}
          <section>
            <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using CodeUsage, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground">
              CodeUsage is an analytics platform that helps engineering teams track usage of AI coding tools such as Claude Code and Codex. Our service consists of a command-line interface (CLI) that collects usage metadata and a web dashboard for viewing analytics.
            </p>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl font-semibold mb-4">3. User Accounts</h2>
            <p className="text-muted-foreground">
              You are responsible for maintaining the security of your account credentials, including your API key. You agree to notify us immediately of any unauthorized use of your account. We are not liable for any loss or damage arising from your failure to protect your account credentials.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-semibold mb-4">4. Acceptable Use</h2>
            <p className="text-muted-foreground mb-4">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Use the service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the service or servers</li>
              <li>Reverse engineer or attempt to extract source code</li>
              <li>Use the service to collect data in violation of any third-party rights</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl font-semibold mb-4">5. Data Ownership</h2>
            <p className="text-muted-foreground">
              You retain ownership of all data you submit to CodeUsage. By using our service, you grant us a limited license to process and display this data solely for the purpose of providing the service to you.
            </p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl font-semibold mb-4">6. Service Availability</h2>
            <p className="text-muted-foreground">
              We strive to maintain high availability but do not guarantee uninterrupted access to the service. We may perform maintenance or updates that temporarily affect availability. We will make reasonable efforts to notify users of planned downtime.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl font-semibold mb-4">7. Termination</h2>
            <p className="text-muted-foreground">
              We reserve the right to suspend or terminate your account if you violate these terms. You may also terminate your account at any time. Upon termination, your data will be deleted in accordance with our Privacy Policy.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-xl font-semibold mb-4">8. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground">
              The service is provided &quot;as is&quot; without warranties of any kind, either express or implied. We do not warrant that the service will be error-free or uninterrupted, or that any defects will be corrected.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-xl font-semibold mb-4">9. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              To the maximum extent permitted by law, CodeUsage shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly.
            </p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-xl font-semibold mb-4">10. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We may modify these terms at any time. We will notify you of any material changes by posting a notice on our website. Your continued use of the service after such changes constitutes acceptance of the new terms.
            </p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-xl font-semibold mb-4">11. Contact</h2>
            <p className="text-muted-foreground">
              If you have any questions about these terms, please contact us at{" "}
              <a
                href="mailto:legal@codeusage.dev"
                className="text-[#D97757] hover:underline"
              >
                legal@codeusage.dev
              </a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} CodeUsage. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
