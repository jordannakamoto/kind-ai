'use client';

import Link from 'next/link';

export default function PostOnboardingPage() {
  return (
    <div className="min-h-screen bg-[#f9f8f7] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Side – Trial Details */}
        <div className=" text-gray-800 font-sans">
          <h2 className="text-2xl font-semibold mb-4 leading-snug">
            Get started with Kind for <span className="text-green-600 font-bold">$0 today</span>
          </h2>

          <div className="flex gap-2 mb-4">
            <button className="px-3 py-1 rounded-full border border-gray-300 text-sm font-medium text-gray-500 bg-white hover:bg-gray-100">
              Annual
            </button>
            <button className="px-3 py-1 rounded-full border border-black text-sm font-medium text-white bg-black">
              Monthly
            </button>
          </div>

          <div className="border border-gray-300 rounded-lg p-4 flex items-center justify-between mb-6 bg-white">
            <div>
              <p className="font-semibold text-lg">Monthly</p>
              <p className="text-sm text-gray-500">$12.99/month</p>
            </div>
            <div className="text-right">
              <p className="text-green-600 font-bold text-lg">$0.00</p>
              <p className="text-green-600 text-sm">for 7 days</p>
            </div>
          </div>

          <h3 className="text-sm font-semibold mb-2 text-gray-700">
            How your free trial works
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Start for free, then $12.99/month. Cancel anytime.
          </p>
          <div className="relative mt-6 ml-1">
  {/* Vertical Line */}
  <div className="absolute left-1.5 top-0 bottom-0 w-2 bg-orange-200" />

  <div className="space-y-8 pl-6">
    {/* Step 1 */}
    <div className="relative">
      <div className="absolute -left-6 top-0 w-5 h-5 rounded-full bg-orange-500" />
      <p className="font-semibold text-sm text-gray-800">Today</p>
      <p className="text-sm text-gray-600 mt-1">
        Start your trial and begin your first few therapy sessions on us.
      </p>
    </div>

    {/* Step 2 */}
    <div className="relative">
      <div className="absolute -left-6 top-0 w-5 h-5 rounded-full bg-orange-400" />
      <p className="font-semibold text-sm text-gray-800">In 5 days</p>
      <p className="text-sm text-gray-600 mt-1">
        We’ll remind you by email before your trial ends.
      </p>
    </div>

    {/* Step 3 */}
    <div className="relative">
      <div className="absolute -left-6 top-0 w-5 h-5 rounded-full bg-orange-300" />
      <p className="font-semibold text-sm text-gray-800">In 7 days</p>
      <p className="text-sm text-gray-600 mt-1">
        You’ll be charged $12.99/month unless you cancel before then.
      </p>
    </div>
  </div>
</div>

          <div className="mt-8">
            <h4 className="text-sm font-semibold mb-2">What’s included</h4>
            <ul className="text-sm space-y-2 text-gray-600">
              <li>✔️ Unlimited voice therapy check-ins</li>
              <li>✔️ Access to AI tools that help you reflect and grow</li>
              <li>✔️ No appointments. No waiting rooms. Just talk.</li>
            </ul>
          </div>
        </div>

        {/* Right Side – Affirmation and Info */}
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 text-gray-800 font-sans flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-4">Thank you for starting your journey with Kind</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-6">
              We built Kind to make mental health support more accessible, flexible, and human. 
              Your sessions are powered by advanced AI that listens with care — always available and private.
            </p>
            <p className="text-sm text-gray-600 mb-6">
              While Kind is not a licensed therapist, it is a tool designed to help you gain insight, relieve pressure, and move forward — at your own pace.
            </p>
            <p className="text-sm text-gray-600 mb-6 italic">
              In this journey, we may find that the best therapist is ourselves.
              Like building a puzzle, the important thing is to start — piece by piece, moment by moment.
            </p>
            <Link href="/privacy" className="text-sm text-indigo-600 hover:underline">
              Read our data policy
            </Link>
          </div>

          <div className="pt-8">
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input type="checkbox" className="mt-1" />
              <span>
                I acknowledge that Kind is a support tool and not a substitute for professional therapy or medical care.
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}