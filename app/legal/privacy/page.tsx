"use client";

import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Kind
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-gray max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Kind AI, Inc. ("Kind," "we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered mental wellness platform.
            </p>
            <p className="text-gray-700 leading-relaxed">
              This policy complies with the California Consumer Privacy Act (CCPA), California Privacy Rights Act (CPRA), and other applicable privacy laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>

            <h3 className="text-lg font-medium text-gray-900 mb-3">Personal Information</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>Account Information:</strong> Email address, name, profile information</li>
              <li><strong>Authentication Data:</strong> Login credentials, OAuth tokens (Google)</li>
              <li><strong>Communication Preferences:</strong> Notification settings, language preferences</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mb-3">Conversation Data</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>Voice Recordings:</strong> Audio of your conversations with our AI (processed and stored securely)</li>
              <li><strong>Transcripts:</strong> Text versions of your conversations</li>
              <li><strong>Session Metadata:</strong> Timestamps, session duration, engagement patterns</li>
              <li><strong>Goals and Progress:</strong> Personal goals you set, progress tracking data</li>
              <li><strong>Insights and Reflections:</strong> AI-generated insights based on your conversations</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mb-3">Technical Information</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>Device Data:</strong> Device type, operating system, browser information</li>
              <li><strong>Usage Analytics:</strong> How you interact with our platform (anonymized)</li>
              <li><strong>Log Data:</strong> IP addresses, access times, error logs</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>

            <h3 className="text-lg font-medium text-gray-900 mb-3">Primary Purposes</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>Provide Therapeutic Support:</strong> Enable AI conversations and personalized responses</li>
              <li><strong>Track Progress:</strong> Monitor your goals and provide insights into patterns</li>
              <li><strong>Improve AI Responses:</strong> Enhance our AI's ability to provide helpful support</li>
              <li><strong>Generate Insights:</strong> Create personalized reflections and session summaries</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mb-3">Secondary Purposes</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>Platform Improvement:</strong> Analyze aggregated, anonymized data to improve our services</li>
              <li><strong>Safety and Security:</strong> Detect and prevent fraud, abuse, or harmful content</li>
              <li><strong>Legal Compliance:</strong> Comply with applicable laws and regulations</li>
              <li><strong>Communication:</strong> Send important updates about our service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Data Security and Storage</h2>

            <h3 className="text-lg font-medium text-gray-900 mb-3">Security Measures</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>Encryption:</strong> All conversations are encrypted in transit and at rest using industry-standard encryption (AES-256)</li>
              <li><strong>Access Controls:</strong> Strict access controls limit who can access your data</li>
              <li><strong>Regular Audits:</strong> We conduct regular security audits and vulnerability assessments</li>
              <li><strong>Secure Infrastructure:</strong> Data is stored on secure, compliant cloud infrastructure</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mb-3">Data Retention</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              We retain your conversation data for as long as your account is active, plus 3 years after account deletion to improve our AI systems (in anonymized form). You can request earlier deletion of your personal data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Information Sharing and Disclosure</h2>

            <h3 className="text-lg font-medium text-gray-900 mb-3">We Do NOT Share Your Personal Conversations</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Your therapy conversations, personal goals, and insights are never shared with third parties, sold, or used for advertising purposes.
            </p>

            <h3 className="text-lg font-medium text-gray-900 mb-3">Limited Sharing Scenarios</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>Service Providers:</strong> Trusted vendors who help us operate our platform (under strict confidentiality agreements)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect safety (with prior notice when legally permissible)</li>
              <li><strong>Emergency Situations:</strong> If we believe there's imminent risk of harm to you or others</li>
              <li><strong>Anonymized Research:</strong> Aggregate, anonymized patterns to improve mental health AI (no personal identification possible)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Your Privacy Rights (California Residents)</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Under the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA), you have the following rights:
            </p>

            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>Right to Know:</strong> Request information about the personal information we collect, use, and share</li>
              <li><strong>Right to Delete:</strong> Request deletion of your personal information</li>
              <li><strong>Right to Correct:</strong> Request correction of inaccurate personal information</li>
              <li><strong>Right to Opt-Out:</strong> Opt-out of the sale or sharing of personal information (Note: We do not sell personal information)</li>
              <li><strong>Right to Limit:</strong> Limit the use of sensitive personal information</li>
              <li><strong>Right to Non-Discrimination:</strong> Not be discriminated against for exercising your privacy rights</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mb-3">How to Exercise Your Rights</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              To exercise any of these rights, email us at privacy@kindtherapy.app or use the privacy controls in your account settings. We will verify your identity and respond within 45 days.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Cookies and Tracking</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We use essential cookies to provide our service and analytics cookies to understand how our platform is used. You can control cookie preferences in your browser settings.
            </p>
            <p className="text-gray-700 leading-relaxed">
              We do not use tracking cookies for advertising or share data with advertising networks.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. International Data Transfers</h2>
            <p className="text-gray-700 leading-relaxed">
              Your data is primarily stored in the United States. If you access our service from outside the US, your information may be transferred to, stored, and processed in the US where our servers are located and our central database is operated.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Children's Privacy</h2>
            <p className="text-gray-700 leading-relaxed">
              Our service is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Changes to This Privacy Policy</h2>
            <p className="text-gray-700 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by email and by posting the new Privacy Policy on this page with an updated "Last updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you have questions about this Privacy Policy or our privacy practices, please contact us:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">
                <strong>Kind AI, Inc.</strong><br />
                Privacy Team<br />
                Email: privacy@kindtherapy.app<br />
                Subject: Privacy Policy Inquiry
              </p>
            </div>
          </section>
        </div>

        {/* Back to Home */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <Link
            href="/"
            className="inline-flex items-center text-indigo-600 hover:text-indigo-500 font-medium"
          >
            ← Back to Kind
          </Link>
        </div>
      </main>
    </div>
  );
}