import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Knobase",
  description: "Terms of Service for Knobase, operated by Metalympics Limited.",
};

export default function TermsOfServicePage() {
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
            Terms of Service
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
              Welcome to Knobase (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or
              &ldquo;us&rdquo;). These Terms of Service (&ldquo;Terms&rdquo;)
              govern your access to and use of the Knobase platform (the
              &ldquo;Service&rdquo;), operated by Metalympics Limited, a company
              incorporated in Hong Kong (&ldquo;Company&rdquo;).
            </p>
            <p className="mt-3">
              By accessing or using the Service, you agree to be bound by these
              Terms. If you disagree with any part of the Terms, you may not
              access the Service.
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
            </div>
          </section>

          {/* 2. Definitions */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              2. Definitions
            </h2>
            <ul className="list-none space-y-2 pl-0">
              <li>
                <strong>&ldquo;Service&rdquo;</strong> refers to the Knobase
                platform, including all features, functionalities, and content
                provided through knobase.io or related domains.
              </li>
              <li>
                <strong>
                  &ldquo;User,&rdquo; &ldquo;you,&rdquo; or &ldquo;your&rdquo;
                </strong>{" "}
                refers to the individual or entity accessing or using the
                Service.
              </li>
              <li>
                <strong>&ldquo;Content&rdquo;</strong> refers to text, documents,
                images, data, or other materials created, uploaded, or stored by
                Users through the Service.
              </li>
              <li>
                <strong>&ldquo;AI Agent&rdquo;</strong> refers to artificial
                intelligence assistants integrated with the Service, including
                those connected through OpenClaw or similar platforms.
              </li>
              <li>
                <strong>&ldquo;Workspace&rdquo;</strong> refers to the
                collaborative environment created by Users within the Service.
              </li>
            </ul>
          </section>

          {/* 3. Account Registration and Security */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              3. Account Registration and Security
            </h2>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              3.1 Eligibility
            </h3>
            <p>
              You must be at least 16 years of age to use the Service. By using
              the Service, you represent and warrant that you meet this
              eligibility requirement.
            </p>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              3.2 Account Creation
            </h3>
            <p>
              To access certain features, you must create an account. You agree
              to provide accurate, current, and complete information during
              registration and to update such information to keep it accurate,
              current, and complete.
            </p>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              3.3 Account Security
            </h3>
            <p>
              You are responsible for safeguarding the password and
              authentication credentials used to access your account. You agree
              not to disclose your credentials to any third party and to notify
              us immediately of any unauthorized use of your account.
            </p>
          </section>

          {/* 4. Service Description */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              4. Service Description
            </h2>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              4.1 Functionality
            </h3>
            <p>
              Knobase provides an AI-native knowledge management platform that
              enables:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Real-time collaborative document editing</li>
              <li>Integration with AI agents (including OpenClaw)</li>
              <li>Workspace management and organization</li>
              <li>Multi-user collaboration features</li>
            </ul>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              4.2 Service Evolution
            </h3>
            <p>
              We reserve the right to modify, suspend, or discontinue the
              Service (or any part thereof) at any time, with or without notice.
              We shall not be liable to you or any third party for any
              modification, suspension, or discontinuation.
            </p>
          </section>

          {/* 5. User Content */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              5. User Content
            </h2>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              5.1 Ownership
            </h3>
            <p>
              You retain all ownership rights to the Content you create, upload,
              or store through the Service. We do not claim ownership of your
              Content.
            </p>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              5.2 License to Us
            </h3>
            <p>
              By using the Service, you grant us a limited, non-exclusive,
              royalty-free license to:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Store and process your Content to provide the Service</li>
              <li>
                Transmit your Content to collaborators and AI agents you
                authorize
              </li>
              <li>
                Create backups and perform technical operations necessary for
                Service operation
              </li>
            </ul>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              5.3 AI Processing
            </h3>
            <p>You acknowledge that:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Content may be processed by AI systems integrated with the
                Service
              </li>
              <li>
                AI agents you connect (including through OpenClaw) may access and
                modify Content based on your permissions
              </li>
              <li>
                We implement reasonable security measures, but cannot guarantee
                absolute protection of Content processed by third-party AI
                systems
              </li>
            </ul>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              5.4 Content Restrictions
            </h3>
            <p>You agree not to upload, create, or share Content that:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Violates any applicable law or regulation</li>
              <li>Infringes intellectual property rights of third parties</li>
              <li>Contains malware, viruses, or malicious code</li>
              <li>Is defamatory, harassing, or discriminatory</li>
              <li>Constitutes unauthorized advertising or spam</li>
            </ul>
          </section>

          {/* 6. AI Features and Limitations */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              6. AI Features and Limitations
            </h2>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              6.1 AI-Generated Content
            </h3>
            <p>
              The Service includes AI-generated content and suggestions. You
              acknowledge that:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                AI-generated content may not always be accurate, complete, or
                appropriate
              </li>
              <li>
                You are solely responsible for reviewing and validating
                AI-generated content before use
              </li>
              <li>
                We do not guarantee the accuracy, reliability, or suitability of
                AI-generated outputs
              </li>
            </ul>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              6.2 Reasoning Traces
            </h3>
            <p>
              The Service may display &ldquo;reasoning traces&rdquo; showing how
              AI agents arrived at certain outputs. These traces are provided for
              transparency only and should not be relied upon as authoritative
              explanations.
            </p>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              6.3 No Professional Advice
            </h3>
            <p>
              AI-generated content does not constitute professional, legal,
              medical, financial, or other specialized advice. Always consult
              qualified professionals for such matters.
            </p>
          </section>

          {/* 7. Subscription and Payment */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              7. Subscription and Payment
            </h2>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              7.1 Free Tier
            </h3>
            <p>
              The Service offers a free tier with limited features. Usage limits
              (such as document count and AI agent quotas) are enforced as
              specified at the time of registration.
            </p>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              7.2 Paid Subscriptions
            </h3>
            <p>
              Paid subscriptions provide additional features and increased
              limits. Subscription terms, including pricing, are presented at the
              time of purchase.
            </p>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              7.3 Payment Processing
            </h3>
            <p>
              Payments are processed through third-party payment processors
              (e.g., Stripe). We do not store complete credit card information on
              our servers.
            </p>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              7.4 Refunds
            </h3>
            <p>
              Refund requests are evaluated on a case-by-case basis. Please
              contact us at{" "}
              <a
                href="mailto:support@knobase.io"
                className="text-neutral-900 underline underline-offset-2"
              >
                support@knobase.io
              </a>{" "}
              for refund inquiries.
            </p>
          </section>

          {/* 8. Intellectual Property */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              8. Intellectual Property
            </h2>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              8.1 Our Rights
            </h3>
            <p>
              The Service, including all software, designs, logos, trademarks,
              and content created by us, is owned by Metalympics Limited and
              protected by intellectual property laws. These Terms do not grant
              you any rights to use our trademarks or branding without prior
              written consent.
            </p>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              8.2 Feedback
            </h3>
            <p>
              Any feedback, suggestions, or ideas you provide regarding the
              Service may be used by us without restriction or compensation to
              you.
            </p>
          </section>

          {/* 9. Limitation of Liability */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              9. Limitation of Liability
            </h2>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              9.1 Disclaimer of Warranties
            </h3>
            <p className="uppercase text-xs leading-relaxed tracking-wide text-neutral-500">
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as
              available&rdquo; without warranties of any kind, either express or
              implied. To the fullest extent permitted by law, we disclaim all
              warranties, including but not limited to:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 uppercase text-xs tracking-wide text-neutral-500">
              <li>
                Warranties of merchantability, fitness for a particular purpose,
                and non-infringement
              </li>
              <li>
                Warranties that the Service will be uninterrupted, timely,
                secure, or error-free
              </li>
              <li>
                Warranties regarding the accuracy or reliability of AI-generated
                content
              </li>
            </ul>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              9.2 Limitation of Liability
            </h3>
            <p className="uppercase text-xs leading-relaxed tracking-wide text-neutral-500">
              To the fullest extent permitted by applicable law: we shall not be
              liable for any indirect, incidental, special, consequential, or
              punitive damages. Our total liability shall not exceed the amount
              you paid us in the twelve (12) months prior to the claim, or
              HK$1,000 (one thousand Hong Kong dollars), whichever is greater.
            </p>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              9.3 Exceptions
            </h3>
            <p>Nothing in these Terms excludes or limits liability for:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Death or personal injury caused by our negligence</li>
              <li>Fraud or fraudulent misrepresentation</li>
              <li>
                Any liability that cannot be excluded or limited under applicable
                law
              </li>
            </ul>
          </section>

          {/* 10. Indemnification */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              10. Indemnification
            </h2>
            <p>
              You agree to indemnify, defend, and hold harmless Metalympics
              Limited and its officers, directors, employees, and agents from and
              against any claims, liabilities, damages, losses, and expenses
              (including reasonable legal fees) arising out of or in any way
              connected with:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Your access to or use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any rights of another party</li>
              <li>Your Content</li>
            </ul>
          </section>

          {/* 11. Termination */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              11. Termination
            </h2>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              11.1 Termination by You
            </h3>
            <p>
              You may terminate your account at any time by contacting us at{" "}
              <a
                href="mailto:support@knobase.io"
                className="text-neutral-900 underline underline-offset-2"
              >
                support@knobase.io
              </a>{" "}
              or through the account settings page.
            </p>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              11.2 Termination by Us
            </h3>
            <p>
              We may suspend or terminate your access to the Service immediately,
              without prior notice or liability, for any reason, including if you
              breach these Terms.
            </p>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              11.3 Effect of Termination
            </h3>
            <p>Upon termination:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Your right to use the Service will immediately cease</li>
              <li>
                We may delete your Content in accordance with our data retention
                policies
              </li>
              <li>
                Provisions of these Terms that by their nature should survive
                termination shall survive
              </li>
            </ul>
          </section>

          {/* 12. Governing Law and Dispute Resolution */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              12. Governing Law and Dispute Resolution
            </h2>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              12.1 Governing Law
            </h3>
            <p>
              These Terms shall be governed by and construed in accordance with
              the laws of the Hong Kong Special Administrative Region, without
              regard to its conflict of law provisions.
            </p>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              12.2 Jurisdiction
            </h3>
            <p>
              Any dispute arising out of or relating to these Terms or the
              Service shall be subject to the exclusive jurisdiction of the
              courts of the Hong Kong Special Administrative Region.
            </p>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              12.3 Informal Resolution
            </h3>
            <p>
              Before filing any claim, we encourage you to contact us at{" "}
              <a
                href="mailto:legal@metalympics.org"
                className="text-neutral-900 underline underline-offset-2"
              >
                legal@metalympics.org
              </a>{" "}
              to attempt to resolve the dispute informally.
            </p>
          </section>

          {/* 13. Data Storage and Location */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              13. Data Storage and Location
            </h2>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              13.1 Local Storage
            </h3>
            <p>
              By default, the Service stores data locally in your browser
              (localStorage). You acknowledge that:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Data stored locally is subject to your browser&apos;s storage
                limits and security
              </li>
              <li>Clearing browser data may result in loss of Content</li>
              <li>
                We are not responsible for data loss due to local browser issues
              </li>
            </ul>

            <h3 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              13.2 Cloud Storage
            </h3>
            <p>
              If you enable cloud storage features, your data may be stored on
              servers located in various jurisdictions. By using cloud features,
              you consent to such transfers and storage.
            </p>
          </section>

          {/* 14. Changes to Terms */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              14. Changes to Terms
            </h2>
            <p>
              We reserve the right to modify or replace these Terms at any time.
              If a revision is material, we will provide at least 30 days&apos;
              notice prior to any new terms taking effect. What constitutes a
              material change will be determined at our sole discretion.
            </p>
            <p className="mt-3">
              Your continued use of the Service following the posting of revised
              Terms means that you accept and agree to the changes.
            </p>
          </section>

          {/* 15. Contact Information */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              15. Contact Information
            </h2>
            <p>For any questions about these Terms, please contact us:</p>
            <div className="mt-4 rounded-lg bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
              <p>
                <strong className="text-neutral-700">Email:</strong>{" "}
                <a
                  href="mailto:legal@metalympics.org"
                  className="text-neutral-900 underline underline-offset-2"
                >
                  legal@metalympics.org
                </a>
              </p>
              <p className="mt-2">
                <strong className="text-neutral-700">Address:</strong>
                <br />
                Metalympics Limited
                <br />
                Rm 1212, Spaces, Two Sky Parc
                <br />
                51 Hung To Road, Kwun Tong, Kowloon
                <br />
                Hong Kong SAR
              </p>
            </div>
          </section>

          {/* 16. Severability */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              16. Severability
            </h2>
            <p>
              If any provision of these Terms is held to be invalid, illegal, or
              unenforceable, the remaining provisions shall continue in full
              force and effect.
            </p>
          </section>

          {/* 17. Entire Agreement */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">
              17. Entire Agreement
            </h2>
            <p>
              These Terms constitute the entire agreement between you and
              Metalympics Limited regarding the Service and supersede all prior
              agreements and understandings.
            </p>
          </section>

          <hr className="border-neutral-200" />

          <p className="text-sm text-neutral-400">
            By using Knobase, you acknowledge that you have read, understood, and
            agree to be bound by these Terms of Service.
          </p>
        </div>
      </article>
    </div>
  );
}
