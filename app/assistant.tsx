"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ThreadListSidebar } from "@/components/assistant-ui/threadlist-sidebar";
import { Separator } from "@/components/ui/separator";
import { DocumentsResultsUI, RetrievalToolResultsUI } from "@/components/ui/results";

import { makeAssistantTool } from "@assistant-ui/react";
import { useState } from "react";

// Define the master tool switch
const MasterToolSwitch = makeAssistantTool({
  toolName: "masterToolSwitch",
});


export const Assistant = () => {
  const [shouldUseTools, setShouldUseTools] = useState(true);

  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      api: "/api/chat",
    }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <SidebarProvider>
        <div className="flex h-dvh w-full pr-0.5">
          <ThreadListSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger />
              <Separator orientation="vertical" className="mr-2 h-4" />
            </header>
            <div className="flex-1 overflow-hidden">
              {shouldUseTools && <MasterToolSwitch />}
              <Thread />
              {/* <DocumentsResultsUI /> */}
              <RetrievalToolResultsUI handleMasterToolSwitch={setShouldUseTools} />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </AssistantRuntimeProvider>
  );
};
