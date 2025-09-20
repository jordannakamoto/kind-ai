// ========================================
// SESSION PROCESSING PIPELINE TEST SUITE
// ========================================
// This tests the complete therapy session processing flow:
//
// 1. POST-CALL WEBHOOK (ElevenLabs)
//    ↓ Receives transcript, stores session, triggers background processes
// 2. PROCESS-TRANSCRIPT ENDPOINT
//    ↓ Extracts insights (title, summary, goals, themes) & updates user profile
// 3. SYNTHESIZE-THERAPY-SESSION ENDPOINT
//    ↓ Creates personalized next session based on updated profile
//
// Run with: node tests/test-session-processing-pipeline.js
// ========================================

const BASE_URL = 'https://kindtherapy.app'; // Production URL

// ========================================
// STEP 2: PROCESS-TRANSCRIPT ENDPOINT TEST
// ========================================
// Tests the AI summarization and profile updating step
async function testProcessTranscript() {
  console.log('🧪 STEP 2: Testing process-transcript endpoint...');
  console.log('📝 This endpoint extracts insights from transcript and updates user profile');

  const testData = {
    userId: 'test-user-123',
    conversationId: 'test-conv-456',
    transcript: `therapist: Hello, how are you feeling today?
you: I've been feeling quite anxious lately, especially about work.
therapist: Can you tell me more about what's causing this anxiety at work?
you: I have a big presentation coming up and I'm worried I'll mess it up.
therapist: That sounds really stressful. What strategies have you tried before to manage presentation anxiety?
you: I usually practice a lot, but this time I feel like it's not enough.
therapist: It sounds like you want to feel more confident. What would help you feel more prepared?
you: Maybe I could practice with a colleague or record myself.`,
    duration: 180
  };

  try {
    const response = await fetch(`${BASE_URL}/api/ai-therapist/process-transcript`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.text();
    console.log('📋 Process Transcript Response Status:', response.status);
    console.log('📋 Process Transcript Response:', result);

    if (!response.ok) {
      console.error('❌ Process transcript failed');
      return false;
    }

    console.log('✅ Process transcript test passed');
    return true;
  } catch (error) {
    console.error('❌ Process transcript test error:', error.message);
    return false;
  }
}

// ========================================
// STEP 3: SYNTHESIZE-THERAPY-SESSION ENDPOINT TEST
// ========================================
// Tests the next session personalization step
async function testSynthesizeSession() {
  console.log('🧪 STEP 3: Testing synthesize-therapy-session endpoint...');
  console.log('🎯 This endpoint creates personalized next session based on user profile');

  const testData = {
    userId: 'test-user-123'
  };

  try {
    const response = await fetch(`${BASE_URL}/api/ai-therapist/synthesize-therapy-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.text();
    console.log('🎯 Synthesize Session Response Status:', response.status);
    console.log('🎯 Synthesize Session Response:', result);

    if (!response.ok) {
      console.error('❌ Synthesize session failed');
      return false;
    }

    console.log('✅ Synthesize session test passed');
    return true;
  } catch (error) {
    console.error('❌ Synthesize session test error:', error.message);
    return false;
  }
}

// ========================================
// STEP 1: POST-CALL WEBHOOK TEST (SIMULATION)
// ========================================
// Simulates ElevenLabs webhook call (without signature validation)
async function testWebhook() {
  console.log('🧪 STEP 1: Testing post-call webhook endpoint...');
  console.log('🪝 This simulates ElevenLabs sending transcript after call ends');

  // This is a simplified test - real webhook would have proper signature
  const testData = {
    type: 'post_call_transcription',
    data: {
      conversation_id: 'test-webhook-conv-789',
      transcript: [
        { message: 'Hello, how are you today?', role: 'agent' },
        { message: 'I am feeling anxious about my job interview tomorrow.', role: 'user' },
        { message: 'That sounds stressful. What specifically worries you about the interview?', role: 'agent' },
        { message: 'I worry I will not be able to answer their questions well.', role: 'user' }
      ],
      metadata: {
        call_duration_secs: 300
      }
    }
  };

  try {
    const response = await fetch(`${BASE_URL}/api/ai-therapist/post-call-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: This test will fail signature validation, but we can see other errors
      },
      body: JSON.stringify(testData),
    });

    const result = await response.text();
    console.log('🪝 Webhook Response Status:', response.status);
    console.log('🪝 Webhook Response:', result);

    // Webhook will likely fail due to signature validation, but we can see if other errors occur
    return true;
  } catch (error) {
    console.error('❌ Webhook test error:', error.message);
    return false;
  }
}

// ========================================
// MAIN TEST RUNNER
// ========================================
async function runAllTests() {
  console.log('🚀 THERAPY SESSION PROCESSING PIPELINE TESTS');
  console.log('🚀 Testing complete flow from webhook → summarization → next session\n');

  console.log('='.repeat(80));
  console.log('🔄 TESTING COMPLETE PROCESSING PIPELINE');
  console.log('='.repeat(80));

  // Test Step 1: Webhook (receives transcript)
  console.log('\n' + '─'.repeat(60));
  const webhookResult = await testWebhook();

  // Test Step 2: Process transcript (AI summarization)
  console.log('\n' + '─'.repeat(60));
  const processResult = await testProcessTranscript();

  // Test Step 3: Synthesize next session (personalization)
  console.log('\n' + '─'.repeat(60));
  const synthesizeResult = await testSynthesizeSession();

  // Results summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 PIPELINE TEST RESULTS SUMMARY');
  console.log('='.repeat(80));
  console.log(`STEP 1 - Post-call Webhook:        ${webhookResult ? '✅ TESTED' : '❌ ERROR'}`);
  console.log(`STEP 2 - Process Transcript:       ${processResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`STEP 3 - Synthesize Next Session:  ${synthesizeResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log('='.repeat(80));

  const allPassed = processResult && synthesizeResult;
  console.log(`\n🎯 OVERALL PIPELINE STATUS: ${allPassed ? '✅ HEALTHY' : '❌ NEEDS ATTENTION'}`);
}

// Run tests
runAllTests().catch(console.error);