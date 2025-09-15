"use client";

import Link from 'next/link';

export default function TermsOfService() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-gray max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Welcome to Kind AI, Inc. ("Kind," "we," "us," or "our"). These Terms of Service ("Terms") govern your use of our AI-powered mental wellness platform, including our website, mobile application, and related services (collectively, the "Service").
            </p>
            <p className="text-gray-700 leading-relaxed">
              By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of these terms, you may not access the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Kind provides an AI-powered conversational platform designed to support mental wellness through:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Voice-first therapy conversations with AI</li>
              <li>Personal goal tracking and accountability</li>
              <li>Session insights and pattern recognition</li>
              <li>Automated journaling and reflection tools</li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              <strong>Important:</strong> Kind is designed to supplement, not replace, professional mental health care. Our Service is not intended to diagnose, treat, cure, or prevent any mental health condition.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Eligibility and Registration</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              You must be at least 18 years old to use our Service. If you are between 13-18 years old, you may only use the Service with parental consent and supervision.
            </p>
            <p className="text-gray-700 leading-relaxed">
              You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. User Responsibilities</h2>
            <p className="text-gray-700 leading-relaxed mb-4">You agree to:</p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Use the Service only for lawful purposes</li>
              <li>Provide honest and accurate information during conversations</li>
              <li>Maintain the confidentiality of your account credentials</li>
              <li>Not attempt to reverse engineer or manipulate our AI systems</li>
              <li>Not share harmful, illegal, or inappropriate content</li>
              <li>Seek professional help for mental health emergencies</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Mental Health Disclaimers</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>Emergency Situations:</strong> If you are experiencing thoughts of self-harm, suicide, or other mental health emergencies, please contact emergency services (911), the National Suicide Prevention Lifeline (988), or go to your nearest emergency room immediately.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>Not Professional Medical Advice:</strong> The conversations and suggestions provided by Kind's AI are not professional medical or psychological advice. Always consult qualified healthcare professionals for diagnosis and treatment of mental health conditions.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>Limitations:</strong> While our AI is designed to be supportive and helpful, it may not always provide appropriate responses. Use your judgment and seek professional help when needed.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Privacy and Data</h2>
            <p className="text-gray-700 leading-relaxed">
              Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices regarding your personal information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Intellectual Property</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              The Service and its original content, features, and functionality are owned by Kind AI, Inc. and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>
            <p className="text-gray-700 leading-relaxed">
              You retain ownership of any content you submit to the Service, but grant us a license to use, modify, and improve our AI systems based on aggregated, anonymized patterns from user interactions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Limitation of Liability</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              To the maximum extent permitted by California law, Kind AI, Inc. shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to damages for loss of profits, goodwill, use, data, or other intangible losses.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Our total liability shall not exceed the amount paid by you for the Service in the twelve months preceding the claim.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Governing Law</h2>
            <p className="text-gray-700 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflict of law provisions. Any disputes shall be resolved in the courts of California.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Changes to Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Contact Information</h2>
            <p className="text-gray-700 leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mt-4">
              <p className="text-gray-700">
                <strong>Kind AI, Inc.</strong><br />
                Email: legal@kindtherapy.app<br />
                Subject: Terms of Service Inquiry
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