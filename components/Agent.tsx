"use client";
import React, { useEffect, useState , useRef} from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

enum CallStatus {
  INACTIVE = "INACTIVE",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  CONNECTING = "CONNECTING",
}

const Agent = ({ userName, userId, type }: AgentProps) => {
  const router = useRouter();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioQueueRef = useRef<Blob[]>([]);
  const isPlayingRef = useRef(false);
  const audioPlayerRef = useRef<HTMLAudioElement>(typeof window !== "undefined" ? new Audio() : null);

  const playNextAudio = () => {
    if (audioQueueRef.current.length > 0 && !isPlayingRef.current && audioPlayerRef.current) {
      isPlayingRef.current = true;
      setIsSpeaking(true);

      const audioBlob = audioQueueRef.current.shift();
      if (audioBlob) {
        const audioUrl = URL.createObjectURL(audioBlob);
        audioPlayerRef.current.src = audioUrl;
        audioPlayerRef.current.play();
        audioPlayerRef.current.onended = () => {
          isPlayingRef.current = false;
          setIsSpeaking(false); // Agent finished speaking
          URL.revokeObjectURL(audioUrl);
          playNextAudio(); // Check if there's more audio in the queue
        };
      }
    }
  };

  const handleCall = async () => {
    if (type !== 'interview') {
      alert("This component is currently configured for interviews only.");
      return;
    }

    setCallStatus(CallStatus.CONNECTING);

    // Connect to our local agent server, passing the userId as a query parameter
    const ws = new WebSocket(`ws://localhost:3001?userId=${userId}`);
    wsRef.current = ws;

    ws.onopen = async () => {
      console.log("Frontend connected to agent server.");
      setCallStatus(CallStatus.ACTIVE);

      // Start capturing microphone audio
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(event.data);
        }
      };
      mediaRecorder.start(250); // Send audio data in 250ms chunks
    };

    // When we receive audio from the server, add it to the playback queue
    ws.onmessage = (event) => {
      if (event.data instanceof Blob) {
        audioQueueRef.current.push(event.data);
        playNextAudio();
      }
    };

    ws.onerror = (err) => console.error("WebSocket error:", err);
    ws.onclose = () => handleDisconnect(); // Clean up when the connection closes
  };

  // Function to end the call and clean up resources
  const handleDisconnect = () => {
    if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
    }
    if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
    }
    setCallStatus(CallStatus.COMPLETED);
    setIsSpeaking(false);
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  };

  const isCallInactiveOrFinished = callStatus === CallStatus.INACTIVE || callStatus === CallStatus.COMPLETED;

  return (
    <>
      <div className="call-view">
        <div className="card-interviewer">
          <div className="avatar">
            <Image
              src="/ai-avatar.png"
              alt="interviewer"
              width={65}
              height={54}
              className="object-cover"
            />
            {isSpeaking && <span className="animate-speak" />}
          </div>
          <h3>AI Interviewer</h3>
        </div>
        <div className="card-border">
          <div className="card-content">
            <Image
              src="/user-avatar.png"
              alt="user"
              width={540}
              height={540}
              className="rounded-full object-cover size-[120px]"
            />
            <h3>{userName}</h3>
          </div>
        </div>
      </div>

      <div className="w-full flex justify-center">
        {callStatus !== "ACTIVE" ? (
          <button className="relative btn-call" onClick={handleCall} >
            <span
              className={cn(
                "absolute animate-ping rounded-full opacity-75",
                (callStatus !== "CONNECTING") && "hidden"
              )}
            ></span>
            <span>
              {isCallInactiveOrFinished ? "Call"
                : "...."}
            </span>
          </button>
        ) : (
          <button className="btn-disconnect" onClick={handleDisconnect}>End</button>
        )}
      </div>
    </>
  );
};

export default Agent;
