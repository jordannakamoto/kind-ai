"use client";

import Link from 'next/link';

export default function UserAgreement() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">User Agreement</h1>
        <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-gray max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Purpose and Scope</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              This User Agreement ("Agreement") supplements our Terms of Service and Privacy Policy, providing specific guidelines for your use of Kind's AI-powered mental wellness platform. This Agreement establishes mutual expectations and responsibilities to ensure a safe, supportive environment for all users.
            </p>
            <p className="text-gray-700 leading-relaxed">
              By using Kind, you acknowledge that you have read, understood, and agree to be bound by this Agreement along with our Terms of Service and Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Understanding Kind's AI System</h2>

            <h3 className="text-lg font-medium text-gray-900 mb-3">What Kind Is</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>An AI-powered conversational platform designed to provide mental wellness support</li>
              <li>A tool to help you reflect, process emotions, and develop coping strategies</li>
              <li>A supplement to, not a replacement for, professional mental health care</li>
              <li>A platform for tracking personal goals and gaining insights into emotional patterns</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mb-3">What Kind Is NOT</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>A licensed mental health professional or therapeutic practice</li>
              <li>A diagnostic tool for mental health conditions</li>
              <li>A crisis intervention or emergency response service</li>
              <li>A substitute for medication management or psychiatric care</li>
              <li>A service that can provide medical advice or treatment recommendations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. User Commitments and Responsibilities</h2>

            <h3 className="text-lg font-medium text-gray-900 mb-3">Honest and Safe Use</h3>
            <p className="text-gray-700 leading-relaxed mb-4">You agree to:</p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>Be Honest:</strong> Provide accurate information about your thoughts, feelings, and experiences</li>
              <li><strong>Use Responsibly:</strong> Engage with the platform in good faith for personal growth and wellness</li>
              <li><strong>Respect Boundaries:</strong> Understand that Kind's AI has limitations and is not infallible</li>
              <li><strong>Maintain Privacy:</strong> Keep your account credentials secure and not share access with others</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mb-3">Prohibited Uses</h3>
            <p className="text-gray-700 leading-relaxed mb-4">You agree NOT to:</p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Use Kind to plan, promote, or engage in illegal activities or self-harm</li>
              <li>Attempt to manipulate, confuse, or test the AI system in ways that could compromise safety</li>
              <li>Share content that is threatening, harassing, or harmful to others</li>
              <li>Use the platform to seek validation for dangerous behaviors</li>
              <li>Rely solely on Kind for mental health support during crisis situations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Safety Protocols and Crisis Response</h2>

            <h3 className="text-lg font-medium text-gray-900 mb-3">Emergency Situations</h3>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800 font-medium mb-2">🚨 If you are experiencing a mental health emergency:</p>
              <ul className="list-disc pl-6 text-red-700 text-sm">
                <li><strong>Call 911</strong> or go to your nearest emergency room</li>
                <li><strong>Call 988</strong> (Suicide & Crisis Lifeline) for immediate support</li>
                <li><strong>Text "HELLO" to 741741</strong> (Crisis Text Line)</li>
                <li><strong>Contact your mental health provider</strong> if you have one</li>
              </ul>
            </div>

            <h3 className="text-lg font-medium text-gray-900 mb-3">When to Seek Professional Help</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              You should seek professional mental health care if you experience:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Persistent thoughts of self-harm or suicide</li>
              <li>Severe depression, anxiety, or other mental health symptoms</li>
              <li>Substance abuse issues</li>
              <li>Relationship or family problems requiring professional intervention</li>
              <li>Trauma that significantly impacts your daily functioning</li>
              <li>Any condition that requires medication management</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Appropriate Expectations</h2>

            <h3 className="text-lg font-medium text-gray-900 mb-3">What You Can Expect from Kind</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>Supportive Conversations:</strong> Empathetic, non-judgmental dialogue designed to help you reflect</li>
              <li><strong>Goal Tracking:</strong> Tools to set, monitor, and reflect on personal wellness goals</li>
              <li><strong>Pattern Recognition:</strong> Insights into emotional patterns and potential triggers</li>
              <li><strong>Available Access:</strong> 24/7 availability for support when you need it</li>
              <li><strong>Privacy Protection:</strong> Secure, confidential handling of your personal information</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mb-3">Understanding AI Limitations</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>AI responses may not always be perfectly appropriate or helpful</li>
              <li>The system cannot read emotional cues the way a human therapist can</li>
              <li>Complex trauma or mental health conditions may require human expertise</li>
              <li>AI cannot provide emergency intervention or crisis response</li>
              <li>The system learns from interactions but may still make mistakes</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Data Use and AI Training</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              To improve Kind's effectiveness, we may use aggregated, anonymized patterns from user interactions to enhance our AI systems. This means:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>Your specific conversations remain private</strong> and are never shared in identifiable form</li>
              <li><strong>Aggregated patterns</strong> help us understand common mental health themes and improve responses</li>
              <li><strong>No personal identifying information</strong> is used in AI training data</li>
              <li><strong>You can opt out</strong> of having your data used for AI improvement in your privacy settings</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Content and Behavioral Guidelines</h2>

            <h3 className="text-lg font-medium text-gray-900 mb-3">Appropriate Content</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Kind is designed for honest discussion of mental health topics. You're encouraged to share:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Feelings, emotions, and emotional experiences</li>
              <li>Stress, anxiety, depression, and mental health concerns</li>
              <li>Relationship and life challenges</li>
              <li>Goals for personal growth and wellness</li>
              <li>Coping strategies and self-care practices</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mb-3">Content We Cannot Support</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Detailed plans for self-harm or suicide</li>
              <li>Illegal activities or substance abuse planning</li>
              <li>Harassment, threats, or harmful content toward others</li>
              <li>Explicit sexual content or inappropriate personal details</li>
              <li>Attempts to manipulate or break the AI system</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Account Management and Data Control</h2>
            <p className="text-gray-700 leading-relaxed mb-4">You have control over your Kind experience:</p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>Conversation History:</strong> View, export, or delete your conversation history</li>
              <li><strong>Privacy Settings:</strong> Control how your data is used for AI improvement</li>
              <li><strong>Account Deletion:</strong> Delete your account and data at any time</li>
              <li><strong>Data Portability:</strong> Request a copy of your data in a portable format</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Compliance and Reporting</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Kind is committed to user safety. If our AI detects concerning patterns that may indicate immediate risk, we may:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Provide additional crisis resources and emergency contact information</li>
              <li>Encourage you to seek immediate professional help</li>
              <li>In extreme cases, contact emergency services (only when required by law and imminent danger is suspected)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Updates and Modifications</h2>
            <p className="text-gray-700 leading-relaxed">
              This User Agreement may be updated periodically to reflect changes in our services, legal requirements, or best practices in AI-assisted mental health support. Material changes will be communicated via email and prominent notice in the platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Getting Help</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you have questions about this User Agreement or need assistance:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">
                <strong>Kind AI, Inc.</strong><br />
                Support Team<br />
                Email: support@kindtherapy.app<br />
                Subject: User Agreement Question
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Acknowledgment</h2>
            <p className="text-gray-700 leading-relaxed">
              By using Kind, you acknowledge that you have read and understood this User Agreement and agree to use our platform responsibly and safely. You understand the limitations of AI-assisted mental health support and commit to seeking professional help when appropriate.
            </p>
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