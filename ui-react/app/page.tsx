"use client";

import {
    CopilotChat,
    CopilotChatAssistantMessage,
    type CopilotChatAssistantMessageProps,
    useRenderTool,
} from "@copilotkit/react-core/v2";
import { z } from "zod";

export default function Home() {
    useTodoToolRenderers();

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


function useTodoToolRenderers() {
    useRenderTool({
        name: "list_todos",
        parameters: z.any(),
        render: (props) => (
            <ListTodosExecutionCard
                title="List TODOs"
                status={props.status}
                params={props.parameters}
                result={props.result}
            />
        ),
    });

    useRenderTool({
        name: "read_todo",
        parameters: z.any(),
        render: (props) => (
            <ToolExecutionCard
                title="Read TODO details"
                status={props.status}
                params={props.parameters}
                result={props.result}
            />
        ),
    });

    useRenderTool({
        name: "add_todo",
        parameters: z.any(),
        render: (props) => (
            <ToolExecutionCard
                title="Add TODO"
                status={props.status}
                params={props.parameters}
                result={props.result}
            />
        ),
    });

    useRenderTool({
        name: "remove_todo",
        parameters: z.any(),
        render: (props) => (
            <ToolExecutionCard
                title="Remove TODO"
                status={props.status}
                params={props.parameters}
                result={props.result}
            />
        ),
    });
}

function ListTodosExecutionCard(props: {
    title: string;
    status: "inProgress" | "executing" | "complete";
    params: unknown;
    result: string | undefined;
}) {
    const todos = JSON.parse(props.result ?? "[]");

    return (
        <ToolExecutionCard {...props}>
            {props.status === "complete" && (
                <ul className="mt-1 space-y-1 rounded-lg border border-zinc-200 bg-white p-2 text-xs text-zinc-700">
                    {todos.length > 0 ? (
                        todos.map((todo, index) => (
                            <li key={`${todo.time}-${todo.title}-${index}`}>
                                {(new Date(todo.time)).toLocaleString()} - {todo.title}
                            </li>
                        ))
                    ) : (
                        <li>No TODO items</li>
                    )}
                </ul>
            )}
        </ToolExecutionCard>
    );
}

function ToolExecutionCard({
    title,
    status,
    params,
    result,
    children,
}: {
    title: string;
    status: "inProgress" | "executing" | "complete";
    params: unknown;
    result: string | undefined;
    children?: React.ReactNode;
}) {
    const trimmedResult = result?.trim() ?? "";
    const shortResult =
        trimmedResult.length > 60 ? `${trimmedResult.slice(0, 60)}...` : trimmedResult;
    const isDone = status === "complete";
    const statusText =
        status === "inProgress" ? "Called" : status === "executing" ? "Running" : "Done";
    const statusClasses = isDone
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

    return (
        <div className="mt-2 rounded-2xl border border-zinc-200 bg-zinc-50/90 px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-zinc-800">{title}</div>
                <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusClasses}`}
                >
                    {statusText}
                </span>
            </div>

            {isDone && (
                <>
                    {children ?? (
                        <pre className="mt-1 overflow-x-auto rounded-lg border border-zinc-200 bg-white p-2 text-xs text-zinc-700 whitespace-pre-wrap">
                            {shortResult}
                        </pre>
                    )}
                </>
            )}
        </div>
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
        const hasToolCalls = (props.message?.toolCalls?.length ?? 0) > 0;

        if (content.trim().length === 0 && !hasToolCalls) {
            return null;
        }

        return <CopilotChatAssistantMessage {...props} />;
    },
    CopilotChatAssistantMessage,
);