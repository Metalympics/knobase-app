import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Knobase",
  description:
    "Privacy Policy for Knobase, operated by Metalympics Limited.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <article className="mx-auto max-w-2xl px-6 py-16 pb-24">
        <nav className="mb-12">
          <Link
            href="/"
            className="text-sm text-neutral-400 transition-colors hover:text-neutral-600"
          >
            &larr; Back to Knobase
          </Link>
        </nav>

        <header className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            Last updated: February 20, 2026
          </p>
        </header>

        <div className="prose-legal space-y-10 text-[15px] leading-relaxed text-neutral-600">
          {/* 1. Introduction */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              1. Introduction
            </h2>
            <p>
              At Metalympics Limited (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or
              &ldquo;us&rdquo;), we take your privacy seriously. This Privacy
              Policy explains how we collect, use, store, and protect your
              personal information when you use Knobase (the
              &ldquo;Service&rdquo;).
            </p>
            <p className="mt-3">
              We are committed to complying with the Personal Data (Privacy)
              Ordinance (Cap. 486) of Hong Kong and other applicable data
              protection laws.
            </p>
            <div className="mt-4 rounded-lg bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
              <p className="font-medium text-neutral-700">
                Company Information
              </p>
              <p className="mt-1">
                Metalympics Limited
                <br />
                Rm 1212, Spaces, Two Sky Parc
                <br />
                51 Hung To Road, Kwun Tong, Kowloon
                <br />
                Hong Kong SAR
              </p>
              <p className="mt-2">
                <strong className="text-neutral-700">Email:</strong>{" "}
                <a
                  href="mailto:privacy@metalympics.org"
                  className="text-neutral-900 underline underline-offset-2"
                >
                  privacy@metalympics.org
                </a>
              </p>
            </div>
          </section>

          {/* 2. Information We Collect */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              2. Information We Collect
            </h2>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              2.1 Information You Provide
            </h3>
            <p>We collect information you provide directly to us:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Account Information:</strong> Email address, name, and
                authentication credentials when you create an account
              </li>
              <li>
                <strong>Profile Information:</strong> Avatar, display name, and
                other optional profile details
              </li>
              <li>
                <strong>Workspace Information:</strong> Workspace names,
                settings, and configurations
              </li>
              <li>
                <strong>Payment Information:</strong> Billing address and payment
                method details (processed by third-party payment processors)
              </li>
              <li>
                <strong>Communications:</strong> Emails, support tickets, and
                other communications with us
              </li>
            </ul>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              2.2 Content You Create
            </h3>
            <p>
              The Service allows you to create, upload, and store various types
              of content:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Documents:</strong> Text, notes, and other written
                content
              </li>
              <li>
                <strong>Media:</strong> Images, files, and attachments you upload
              </li>
              <li>
                <strong>Collaboration Data:</strong> Comments, edits, version
                history, and activity logs
              </li>
              <li>
                <strong>AI Interactions:</strong> Prompts, AI-generated content,
                and reasoning traces
              </li>
            </ul>
            <p className="mt-3 rounded-lg bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
              <strong className="text-neutral-700">Important:</strong> By
              default, this content is stored locally in your browser
              (localStorage) and is not transmitted to our servers unless you
              explicitly enable cloud synchronization features.
            </p>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              2.3 Information Collected Automatically
            </h3>
            <p>
              When you use the Service, we automatically collect certain
              information:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Usage Data:</strong> Feature usage, interactions, and
                preferences
              </li>
              <li>
                <strong>Device Information:</strong> Browser type, operating
                system, IP address, and device identifiers
              </li>
              <li>
                <strong>Log Data:</strong> Access times, pages viewed, and system
                activity
              </li>
              <li>
                <strong>Cookies and Similar Technologies:</strong> See our Cookie
                Policy section below
              </li>
            </ul>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              2.4 Information from Third Parties
            </h3>
            <p>
              We may receive information from third-party services you connect:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>OpenClaw Integration:</strong> Configuration and usage
                data from connected OpenClaw instances
              </li>
              <li>
                <strong>Authentication Providers:</strong> Information from
                Google, GitHub, or other OAuth providers you use
              </li>
              <li>
                <strong>AI Providers:</strong> Usage data from integrated AI
                services (OpenAI, Anthropic, etc.)
              </li>
            </ul>
          </section>

          {/* 3. How We Use Your Information */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              3. How We Use Your Information
            </h2>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              3.1 Providing the Service
            </h3>
            <ul className="list-disc space-y-1 pl-5">
              <li>Creating and managing your account</li>
              <li>
                Enabling document creation, editing, and collaboration
              </li>
              <li>Processing AI agent interactions</li>
              <li>Facilitating real-time collaboration between users</li>
            </ul>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              3.2 Improving the Service
            </h3>
            <ul className="list-disc space-y-1 pl-5">
              <li>Analyzing usage patterns to enhance features</li>
              <li>Debugging and fixing issues</li>
              <li>Developing new functionality</li>
              <li>Conducting research and analytics</li>
            </ul>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              3.3 Communications
            </h3>
            <ul className="list-disc space-y-1 pl-5">
              <li>Sending service-related notifications</li>
              <li>Responding to your inquiries and support requests</li>
              <li>
                Sending marketing communications (with your consent, which you
                may withdraw at any time)
              </li>
            </ul>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              3.4 Security and Compliance
            </h3>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Detecting and preventing fraud, abuse, and security incidents
              </li>
              <li>Complying with legal obligations</li>
              <li>Enforcing our Terms of Service</li>
            </ul>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              3.5 AI Training and Improvement
            </h3>
            <p className="rounded-lg bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
              <strong className="text-neutral-700">Important:</strong> We do not
              use your Content to train AI models without your explicit consent.
              Anonymous, aggregated usage patterns may be used to improve AI
              features. You may opt out of any data usage for AI improvement in
              your settings.
            </p>
          </section>

          {/* 4. Data Storage and Security */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              4. Data Storage and Security
            </h2>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              4.1 Local Storage (Default)
            </h3>
            <p>
              By default, your Content is stored locally in your browser using
              localStorage:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Location:</strong> Your device/browser only
              </li>
              <li>
                <strong>Encryption:</strong> Subject to your browser&apos;s
                security mechanisms
              </li>
              <li>
                <strong>Access:</strong> Only accessible from your browser
                instance
              </li>
              <li>
                <strong>Backup:</strong> We do not create backups of localStorage
                data
              </li>
            </ul>
            <p className="mt-3 text-sm text-neutral-400">
              Clearing browser data, using incognito mode, or switching browsers
              will affect localStorage data.
            </p>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              4.2 Cloud Storage (Optional)
            </h3>
            <p>If you enable cloud synchronization:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Storage Location:</strong> Cloud servers, potentially in
                multiple jurisdictions including the United States, European
                Union, and Asia-Pacific regions
              </li>
              <li>
                <strong>Encryption:</strong> Data is encrypted in transit (TLS
                1.3) and at rest (AES-256)
              </li>
              <li>
                <strong>Retention:</strong> We retain your data as long as your
                account is active, or as required by law
              </li>
              <li>
                <strong>Backup:</strong> We maintain backups for disaster
                recovery purposes
              </li>
            </ul>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              4.3 Security Measures
            </h3>
            <p>
              We implement appropriate technical and organizational measures to
              protect your data:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments and penetration testing</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Incident response procedures</li>
            </ul>
            <p className="mt-3 text-sm text-neutral-400">
              No method of transmission over the internet or electronic storage
              is 100% secure. While we strive to use commercially acceptable
              means to protect your information, we cannot guarantee absolute
              security.
            </p>
          </section>

          {/* 5. Data Sharing and Disclosure */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              5. Data Sharing and Disclosure
            </h2>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              5.1 Third-Party Service Providers
            </h3>
            <p>
              We may share your information with trusted third parties who assist
              us in operating the Service:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Cloud Infrastructure:</strong> Hosting and storage
                providers
              </li>
              <li>
                <strong>Payment Processors:</strong> For processing subscription
                payments
              </li>
              <li>
                <strong>Analytics Providers:</strong> For understanding Service
                usage
              </li>
              <li>
                <strong>AI Providers:</strong> For processing AI agent requests
                (only with your explicit connection)
              </li>
            </ul>
            <p className="mt-3">
              All third-party providers are contractually obligated to protect
              your data and use it only for the purposes we specify.
            </p>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              5.2 AI and Machine Learning Providers
            </h3>
            <p>When you use AI features:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Your prompts and Content may be sent to third-party AI providers
                (e.g., OpenAI, Anthropic)
              </li>
              <li>
                These providers have their own privacy policies and data handling
                practices
              </li>
              <li>
                We encourage you to review the privacy policies of any AI
                services you connect
              </li>
            </ul>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              5.3 Legal Requirements
            </h3>
            <p>
              We may disclose your information if required to do so by law or in
              response to valid requests by public authorities, including to
              meet:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>National security or law enforcement requirements</li>
              <li>Court orders, subpoenas, or legal process</li>
              <li>
                Investigation of potential violations of our Terms of Service
              </li>
            </ul>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              5.4 Business Transfers
            </h3>
            <p>
              If Metalympics Limited is involved in a merger, acquisition, or
              asset sale, your information may be transferred. We will provide
              notice before your information is transferred and becomes subject
              to a different Privacy Policy.
            </p>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              5.5 With Your Consent
            </h3>
            <p>
              We may share your information with third parties when we have your
              explicit consent to do so.
            </p>
          </section>

          {/* 6. Your Rights and Choices */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              6. Your Rights and Choices
            </h2>
            <p>
              Under the Personal Data (Privacy) Ordinance of Hong Kong and other
              applicable laws, you have the following rights:
            </p>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              6.1 Access and Correction
            </h3>
            <p>You have the right to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate or incomplete data</li>
              <li>Request a copy of your data in a portable format</li>
            </ul>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              6.2 Deletion
            </h3>
            <p>
              You may request deletion of your personal data, subject to:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Legal obligations requiring retention</li>
              <li>
                Legitimate business purposes (e.g., fraud prevention)
              </li>
              <li>
                Technical limitations (data may remain in backups for a limited
                period)
              </li>
            </ul>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              6.3 Restriction and Objection
            </h3>
            <p>You have the right to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Restrict processing of your data</li>
              <li>Object to processing based on legitimate interests</li>
              <li>
                Withdraw consent at any time (without affecting lawfulness of
                prior processing)
              </li>
            </ul>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              6.4 Data Portability
            </h3>
            <p>
              You may request your data in a structured, commonly used,
              machine-readable format.
            </p>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              6.5 Exercising Your Rights
            </h3>
            <p>
              To exercise these rights, contact us at{" "}
              <a
                href="mailto:privacy@metalympics.org"
                className="text-neutral-900 underline underline-offset-2"
              >
                privacy@metalympics.org
              </a>
              . We will respond within 30 days of receiving your request.
            </p>
          </section>

          {/* 7. Cookies and Tracking Technologies */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              7. Cookies and Tracking Technologies
            </h2>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              7.1 What We Use
            </h3>
            <p>We use cookies and similar technologies to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Essential Cookies:</strong> Required for the Service to
                function
              </li>
              <li>
                <strong>Authentication:</strong> Remember your login session
              </li>
              <li>
                <strong>Preferences:</strong> Store your settings and preferences
              </li>
              <li>
                <strong>Analytics:</strong> Understand how you use the Service
                (anonymized)
              </li>
            </ul>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              7.2 Your Choices
            </h3>
            <p>
              Most web browsers allow you to control cookies through their
              settings. However, disabling cookies may limit your ability to use
              certain features of the Service.
            </p>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              7.3 Third-Party Analytics
            </h3>
            <p>
              We may use third-party analytics services (e.g., Plausible,
              PostHog) that use cookies to collect anonymous usage data.
            </p>
          </section>

          {/* 8. International Data Transfers */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              8. International Data Transfers
            </h2>
            <p>
              Your information may be transferred to and processed in countries
              other than Hong Kong, including:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>United States (for cloud hosting and AI services)</li>
              <li>European Union (for certain infrastructure)</li>
              <li>
                Other jurisdictions where our service providers operate
              </li>
            </ul>
            <p className="mt-3">
              When we transfer data internationally, we ensure appropriate
              safeguards are in place, including standard contractual clauses,
              adequacy decisions, and other legally recognized transfer
              mechanisms.
            </p>
          </section>

          {/* 9. Children's Privacy */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              9. Children&apos;s Privacy
            </h2>
            <p>
              The Service is not intended for individuals under 16 years of age.
              We do not knowingly collect personal information from children
              under 16. If we become aware that we have collected personal
              information from a child under 16, we will take steps to delete
              such information.
            </p>
          </section>

          {/* 10. Data Retention */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              10. Data Retention
            </h2>
            <p>
              We retain your personal data for as long as necessary to provide
              the Service, comply with legal obligations, resolve disputes, and
              enforce our agreements.
            </p>
            <div className="mt-4 space-y-2">
              <div className="flex items-start gap-3 rounded-lg bg-neutral-50 px-4 py-3 text-sm">
                <span className="shrink-0 font-medium text-neutral-700">
                  Account Information
                </span>
                <span className="text-neutral-500">
                  Retained while account is active, deleted 30 days after account
                  closure
                </span>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-neutral-50 px-4 py-3 text-sm">
                <span className="shrink-0 font-medium text-neutral-700">
                  Content (Cloud)
                </span>
                <span className="text-neutral-500">
                  Retained while account is active, deleted within 90 days of
                  account closure
                </span>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-neutral-50 px-4 py-3 text-sm">
                <span className="shrink-0 font-medium text-neutral-700">
                  Content (Local)
                </span>
                <span className="text-neutral-500">
                  Not retained by us (stored on your device only)
                </span>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-neutral-50 px-4 py-3 text-sm">
                <span className="shrink-0 font-medium text-neutral-700">
                  Usage Data
                </span>
                <span className="text-neutral-500">
                  Anonymized after 12 months, deleted after 24 months
                </span>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-neutral-50 px-4 py-3 text-sm">
                <span className="shrink-0 font-medium text-neutral-700">
                  Payment Records
                </span>
                <span className="text-neutral-500">
                  Retained for 7 years as required by law
                </span>
              </div>
            </div>
          </section>

          {/* 11. AI and Automated Decision-Making */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              11. AI and Automated Decision-Making
            </h2>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              11.1 AI Features
            </h3>
            <p>The Service uses AI to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Generate content suggestions</li>
              <li>Provide reasoning traces</li>
              <li>Facilitate agent collaboration</li>
            </ul>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              11.2 No Automated Decision-Making
            </h3>
            <p>
              We do not use AI to make decisions that have legal or similarly
              significant effects on you without human intervention.
            </p>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              11.3 Transparency
            </h3>
            <p>We strive to make AI interactions transparent:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Reasoning traces show how AI arrived at outputs</li>
              <li>You maintain full control over AI-generated content</li>
              <li>You can disable AI features at any time</li>
            </ul>
          </section>

          {/* 12. Changes to This Privacy Policy */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              12. Changes to This Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify
              you of any changes by:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Posting the new Privacy Policy on this page</li>
              <li>Sending an email notification for material changes</li>
              <li>Updating the &ldquo;Last Updated&rdquo; date</li>
            </ul>
            <p className="mt-3">
              Your continued use of the Service after any changes constitutes
              acceptance of the updated Privacy Policy.
            </p>
          </section>

          {/* 13. Contact Us */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              13. Contact Us
            </h2>
            <p>
              If you have any questions about this Privacy Policy or our data
              practices, please contact us:
            </p>
            <div className="mt-4 rounded-lg bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
              <p className="font-medium text-neutral-700">
                Data Protection Officer
              </p>
              <p className="mt-1">
                Metalympics Limited
                <br />
                Rm 1212, Spaces, Two Sky Parc
                <br />
                51 Hung To Road, Kwun Tong, Kowloon
                <br />
                Hong Kong SAR
              </p>
              <p className="mt-2">
                <strong className="text-neutral-700">Email:</strong>{" "}
                <a
                  href="mailto:privacy@metalympics.org"
                  className="text-neutral-900 underline underline-offset-2"
                >
                  privacy@metalympics.org
                </a>
              </p>
              <p className="mt-1 text-neutral-400">
                Subject Line: Privacy Inquiry
              </p>
            </div>
            <p className="mt-3">
              We will respond to your inquiry within 30 days.
            </p>
          </section>

          {/* 14. Complaints */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              14. Complaints
            </h2>
            <p>
              If you believe we have not handled your personal data in accordance
              with this Privacy Policy or applicable law, you have the right to
              lodge a complaint with:
            </p>
            <div className="mt-4 rounded-lg bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
              <p className="font-medium text-neutral-700">
                Privacy Commissioner for Personal Data, Hong Kong
              </p>
              <p className="mt-1">
                12/F, Sunlight Tower, 248 Queen&apos;s Road East, Wan Chai, Hong
                Kong
              </p>
              <p className="mt-1">
                Website:{" "}
                <a
                  href="https://www.pcpd.org.hk"
                  className="text-neutral-900 underline underline-offset-2"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  www.pcpd.org.hk
                </a>
              </p>
            </div>
            <p className="mt-3">
              We encourage you to contact us first so we can attempt to resolve
              your concerns.
            </p>
          </section>

          {/* 15. Cookie Policy */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              15. Cookie Policy
            </h2>
            <p>
              For detailed information about the cookies we use, please see our
              Cookie Policy at{" "}
              <a
                href="https://knobase.io/cookies"
                className="text-neutral-900 underline underline-offset-2"
              >
                knobase.io/cookies
              </a>
              .
            </p>
          </section>

          <hr className="border-neutral-200" />

          <p className="text-sm text-neutral-400">
            By using Knobase, you acknowledge that you have read, understood, and
            agree to the practices described in this Privacy Policy.
          </p>
        </div>
      </article>
    </div>
  );
}
