import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

enum CallStatus {
  INACTIVE = "INACTIVE",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  CONNECTING = "CONNECTING",
}

const Agent = ({ userName, userId, type }: AgentProps) => {
  const isSpeaking = true;
  const callStatus = CallStatus.COMPLETED;
  const messages = [
    "what is your greatest strength?",
    "my greatest strength is my ability to adapt to new situations and learn quickly. I am also very organized and detail-oriented, which helps me to stay on top of my work and meet deadlines.",
  ];
  const lastMessage = messages[messages.length - 1];
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

       {messages.length > 0 && (
      <div className="transcript-border">
        <div className="transcript">
            <p key={lastMessage} className={cn('transition-opacity duration-500 opacity-0' , 'animate-fadeIn opacity-100')}>
                {lastMessage}
            </p>
        </div>
      </div>
       )}
      <div className="w-full flex justify-center">
        {callStatus !== "ACTIVE" ? (
          <button className="relative btn-call">
            <span
              className={cn(
                "absolute animate-ping rounded-full opacity-75",
                (callStatus !== "CONNECTING") & "hidden"
              )}
            ></span>
            <span>
              {callStatus === "INACTIVE" || callStatus === "COMPLETED"
                ? "Call"
                : "...."}
            </span>
          </button>
        ) : (
          <button className="btn-disconnect">End</button>
        )}
      </div>
    </>
  );
};

export default Agent;
