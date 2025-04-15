import { NextRequest, NextResponse } from "next/server";

import { ElevenLabsClient } from "elevenlabs";

export async function GET(req: NextRequest) {
  const agentId = process.env.AGENT_ID;
  const userEmail = req.nextUrl.searchParams.get("user_email");

  if (!agentId) {
    return NextResponse.json({ error: "AGENT_ID is not set" }, { status: 500 });
  }

  try {
    const client = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });

    const response = await client.conversationalAi.getSignedUrl({
      agent_id: agentId,
      ...(userEmail && {
        custom: {
          user_email: userEmail,
        },
      }),
    });

    console.log("Connected to:", response.signed_url);
    return NextResponse.json({ signedUrl: response.signed_url });
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return NextResponse.json(
      { error: "Failed to get signed URL" },
      { status: 500 }
    );
  }
}