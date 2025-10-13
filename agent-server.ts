import { createClient, AgentLiveClient } from "@deepgram/sdk";
import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import dotenv from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

dotenv.config();

const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

const deepgramApiKey = process.env.DEEPGRAM_API_KEY;

if (!deepgramApiKey) {
  console.error("DEEPGRAM_API_KEY is not defined. Please check your .env.local file.");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: cert(firebaseConfig),
  });
}
const db = getFirestore();

const deepgram = createClient(deepgramApiKey);
const wss = new WebSocketServer({ port: 3001 });

console.log("🎤 Voice agent server started on ws://localhost:3001");

wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const interviewId = url.searchParams.get("interviewId");

  if (!interviewId) {
    console.error("Error: interviewId is required for connection.");
    ws.close(1008, "Interview ID is required");
    return;
  }

  console.log(`Client connected for interview: ${interviewId}`);

  let interviewQuestions: string[] = [];
  try {
    const interviewDoc = await db.collection("interviews").doc(interviewId).get();
    if (!interviewDoc.exists) throw new Error("Interview not found in database");
    
    const data = interviewDoc.data();
    if (!data || !data.questions || data.questions.length === 0) {
        throw new Error("No questions found for this interview");
    }
    interviewQuestions = data.questions;
  } catch (error) {
    console.error("Error fetching questions from Firestore:", error);
    ws.close(1011, "Could not retrieve interview questions.");
    return;
  }

  const deepgramConnection: AgentLiveClient = deepgram.agent();
  const formattedQuestions = interviewQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n");

  deepgramConnection.on("open", () => {
    console.log("Deepgram connection opened.");
    
    deepgramConnection.configure({
      audio: {
        input: {
          encoding: "linear16",
          sample_rate: 16000,
        },
        output: {
          encoding: "mp3",
          sample_rate: 24000,
          container: "mp3",
        },
      },
      agent: {
        listen: {
          provider: { type: "deepgram", model: "nova-2" },
        },
        speak: {
          provider: { type: "deepgram", model: "aura-asteria-en" },
        },
        think: {
          provider: {
            type: "webhook",
            url: "http://localhost:3001/api/deepgram/generate", // We will create this in a later step
          },
          // FIX #1: The initial instructions are now part of the main prompt.
          prompt: `You are a friendly and professional job interviewer.
          Your task is to conduct a mock interview by asking the user the following questions one by one.
          Do not ask them all at once. Wait for the user to answer each question before moving to the next.
          Engage with their answers briefly if appropriate, but keep the interview focused.
          Start by saying "Hello, thank you for joining. I'll be conducting your interview today. Let's start with the first question."
          Here are the questions you must ask:
          ${formattedQuestions}`,
        },
      },
    });
  });

  deepgramConnection.on("audio", (audio) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(audio);
  });

  // FIX #2: Cast the message type to 'any' to resolve the type mismatch.
  ws.on("message", (message: any) => {
    deepgramConnection.send(message);
  });

  deepgramConnection.on("close", () => console.log("Deepgram connection closed."));
  ws.on("close", () => {
    console.log("Client disconnected.");
    deepgramConnection.disconnect();
  });
});