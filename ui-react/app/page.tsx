"use client";

import {
    CopilotChat,
    CopilotChatAssistantMessage,
    type CopilotChatAssistantMessageProps,
} from "@copilotkit/react-core/v2";

export default function Home() {
    return (
        <main className="min-h-screen bg-white text-zinc-900">
            <div className="mx-auto flex h-screen w-full max-w-4xl flex-col px-4">
                <header className="flex shrink-0 items-center py-4">
                    <div className="flex w-full items-center justify-between rounded-3xl border border-zinc-200/80 bg-white/85 px-4 py-3 shadow-sm shadow-zinc-200/70 backdrop-blur">
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 shadow-lg shadow-sky-100">
                                <img
                                    src="/Robot-MS-Blue.png"
                                    alt="AG2 Agent robot"
                                    className="size-7 object-contain [image-rendering:pixelated]"
                                />
                            </div>
                            <div>
                                <div className="text-sm font-semibold tracking-tight text-zinc-900">
                                    AG2 Agent
                                </div>
                                <div className="text-xs text-zinc-500">
                                    Your personal copilot
                                </div>
                            </div>
                        </div>

                        <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 sm:flex">
                            <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgb(16_185_129/0.12)]" />
                            Online
                        </div>
                    </div>
                </header>

                <div className="min-h-0 flex-1">
                    <CopilotChat
                        labels={{
                            welcomeMessageText: "AG2 Agent",
                            chatInputPlaceholder: "Message AG2 Agent...",
                        }}
                        welcomeScreen={false}
                        messageView={{
                            assistantMessage: AssistantMessageWithoutEmptyToolEvents,
                        }}
                        className="ag2-chat h-full"
                    />
                </div>
            </div>
        </main>
    );
}


const AssistantMessageWithoutEmptyToolEvents = Object.assign(
  // Do not render the message if it has no content
  function AssistantMessageWithoutEmptyToolEvents(
    props: CopilotChatAssistantMessageProps,
  ) {
    const rawContent = props.message?.content;
    const content =
      typeof rawContent === "string" ? rawContent : String(rawContent ?? "");

    if (content.trim().length === 0) {
      return null;
    }

    return <CopilotChatAssistantMessage {...props} />;
  },
  CopilotChatAssistantMessage,
);