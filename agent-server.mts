import { createClient } from "@deepgram/sdk";
import { WebSocketServer } from 'ws';
import dotenv from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

dotenv.config();

interface DeepgramConnection {
    on(event: string, listener: (data?:any) => void): void;
    configure(config: {
        agent: {
            listen: { model: string };
            speak: { model: string };
            think: {
                provider: string;
                model: string;
                prompt: string;
            };
        };
    }): void;
    send(data: any): void;
    disconnect(): void;
}

interface InterviewQuestion {
    questions: string[];
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}
const db = getFirestore();

const deepgram = createClient(process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY);
const wss = new WebSocketServer({
    noServer: true
});

console.log("🎤 Agent server started ");


wss.on("connection", async (ws: import("ws").WebSocket, req: import("http").IncomingMessage) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const interviewId: string | null = url.searchParams.get("interviewId");

    if (!interviewId) {
        console.error("Error: interviewId is required.");
        ws.close(1008, "Interview ID is required");
        return;
    }

    console.log(`Client connected for interviewId: ${interviewId}`);

    let interviewQuestions: string[] = [];
    try {
        const interviewDoc = await db.collection("interviews").doc(interviewId).get();
        if (!interviewDoc.exists) {
            throw new Error("Interview not found");
        }
        const data = interviewDoc.data() as InterviewQuestion | undefined;
        interviewQuestions = data?.questions || [];
        if (interviewQuestions.length === 0) {
             throw new Error("No questions found for this interview");
        }
    } catch (error) {
        console.error("Error fetching questions from Firestore:", error);
        ws.close(1011, "Could not retrieve interview questions.");
        return;
    }

    const deepgramConnection = deepgram.agent.connect() as DeepgramConnection;
    const formattedQuestions: string = interviewQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n");

    deepgramConnection.on("open", () => {
        console.log("Deepgram connection opened.");

        
        deepgramConnection.configure({
            agent: {
                listen: { model: "nova-2" },
                speak: { model: "aura-asteria-en" },
                think: {
                    provider: "deepgram",
                    model: "llama3-8b",
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

   
    deepgramConnection.on("audio", (audio: any) => {
        if (ws.readyState === 1) ws.send(audio);
    });

    ws.on("message", (message: import("ws").RawData) => {
        deepgramConnection.send(message);
    });

    
    deepgramConnection.on("close", () => console.log("Deepgram connection closed."));
    ws.on("close", () => {
        console.log("Client disconnected.");
        deepgramConnection.disconnect();
    });
});