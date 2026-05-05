"use client";

import {
    CopilotChat,
    CopilotChatAssistantMessage,
    type CopilotChatAssistantMessageProps,
    useFrontendTool,
    useAgent,
    useAgentContext,
    useRenderTool,
} from "@copilotkit/react-core/v2";
import { useEffect, useState } from "react";
import { z } from "zod";

export default function Home() {
    useUserIdVariable();
    useTodoToolRenderers();
    useBrowserTools();
    useGenUITools();

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


function useBrowserTools() {
    useFrontendTool({
        name: "get_user_location",
        description: "Get user's current geolocation from browser API. Call it AUTOMATICALLY each time you want to know user location or local time.",
        parameters: z.object({}),
        handler: async () => {
            if (!("geolocation" in navigator)) {
                return {
                    ok: false,
                    error: "Geolocation is not supported in this browser.",
                };
            }

            try {
                const position = await getCurrentPositionWithRetry(2);
                const { latitude, longitude, accuracy } = position.coords;

                return {
                    ok: true,
                    latitude,
                    longitude,
                    accuracy_m: accuracy,
                    local_time: new Date().toLocaleString(),
                };
            } catch (error) {
                return {
                    ok: false,
                    error: formatGeolocationError(error),
                    local_time: new Date().toLocaleString(),
                };
            }
        },
        render: (props) => (
            <ToolExecutionCard
                title="Get user location"
                status={props.status}
                params={props.args}
                result={props.result}
            />
        ),
    });
}

function useGenUITools() {
    useFrontendTool({
        name: "render_idea_list",
        description:
            "Render a visual list of ideas/capabilities for the user. Use this when the user asks what they can do, asks for suggestions, or asks for example tasks.",
        parameters: z.object({
            title: z.string().optional(),
            ideas: z
                .array(
                    z.object({
                        title: z.string(),
                        description: z.string().optional(),
                    }),
                )
                .optional(),
        }),
        handler: async (args) => {
            return {
                ok: true,
                title: args.title ?? "What I can do",
                ideas: args.ideas?.length ? args.ideas : [],
            };
        },
        render: (props) => (
            <IdeasExecutionCard
                status={props.status}
                args={props.args}
                result={props.result}
            />
        ),
    });
}

function getCurrentPosition(options?: PositionOptions): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
}

async function getCurrentPositionWithRetry(maxAttempts: number): Promise<GeolocationPosition> {
    const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
    };

    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await getCurrentPosition(options);
        } catch (error) {
            lastError = error;
            const geoError = error as GeolocationPositionError;

            // Retry only for temporary unavailability (kCLErrorLocationUnknown etc.)
            if (geoError?.code !== geoError?.POSITION_UNAVAILABLE || attempt === maxAttempts) {
                break;
            }
            await new Promise((resolve) => setTimeout(resolve, 700));
        }
    }

    throw lastError;
}

function formatGeolocationError(error: unknown): string {
    const geoError = error as GeolocationPositionError | undefined;
    if (!geoError || typeof geoError.code !== "number") {
        return "Unable to get current location.";
    }

    if (geoError.code === geoError.PERMISSION_DENIED) {
        return "Location permission denied by user/browser.";
    }
    if (geoError.code === geoError.POSITION_UNAVAILABLE) {
        return "Location is currently unavailable. Please try again in a few seconds.";
    }
    if (geoError.code === geoError.TIMEOUT) {
        return "Location request timed out.";
    }
    return geoError.message || "Unable to get current location.";
}

function useUserIdVariable() {
    const { agent } = useAgent({ agentId: "agent" });
    const userId = usePersistentUserId();

    // Add explicit agent context so the model can reason about the active user.
    useAgentContext({
        description: "user_id",
        value: userId,
    });

    // AGUIStream resolves Variable() values from run state, so keep user_id there.
    useEffect(() => {
        const currentState = (agent.state ?? {}) as Record<string, unknown>;
        if (currentState.user_id === userId) {
            return;
        }
        agent.setState({
            ...currentState,
            user_id: userId,
        });
    }, [agent, userId]);
}

function usePersistentUserId() {
    const [userId, setUserId] = useState("user_local");

    useEffect(() => {
        const storageKey = "ag-ui-user-id";
        const existing = window.localStorage.getItem(storageKey);
        if (existing) {
            setUserId(existing);
            return;
        }

        const generated = `user_${globalThis.crypto.randomUUID().slice(0, 8)}`;
        window.localStorage.setItem(storageKey, generated);
        setUserId(generated);
    }, []);

    return userId;
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

    useRenderTool({
        name: "web_search",
        parameters: z.any(),
        render: (props) => (
            <ToolExecutionCard
                title="Web search"
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
    const todos: { time: string; title: string }[] = JSON.parse(props.result ?? "[]");

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

function IdeasExecutionCard(props: {
    status: "inProgress" | "executing" | "complete";
    args: unknown;
    result: unknown;
}) {
    const parsed = z
        .object({
            title: z.string().optional(),
            ideas: z
                .array(
                    z.object({
                        title: z.string(),
                        description: z.string().optional(),
                    }),
                )
                .optional(),
        })
        .safeParse(props.result);

    const fallback = z
        .object({
            title: z.string().optional(),
            ideas: z
                .array(
                    z.object({
                        title: z.string(),
                        description: z.string().optional(),
                    }),
                )
                .optional(),
        })
        .safeParse(props.args);

    const title =
        (parsed.success ? parsed.data.title : undefined) ??
        (fallback.success ? fallback.data.title : undefined) ??
        "What I can do";
    const ideas =
        (parsed.success ? parsed.data.ideas : undefined) ??
        (fallback.success ? fallback.data.ideas : undefined) ??
        [];

    return (
        <ToolExecutionCard
            title="Idea list"
            status={props.status}
            params={props.args}
            result={JSON.stringify(props.result)}
        >
            {props.status === "complete" && (
                <div className="mt-1 rounded-lg border border-zinc-200 bg-white p-2 text-xs text-zinc-700">
                    <div className="mb-2 text-sm font-medium text-zinc-900">{title}</div>
                    <ul className="space-y-1.5">
                        {ideas.length > 0 ? (
                            ideas.map((idea, index) => (
                                <li key={`${idea.title}-${index}`}>
                                    <div className="font-medium text-zinc-800">{idea.title}</div>
                                    {idea.description && (
                                        <div className="text-zinc-600">{idea.description}</div>
                                    )}
                                </li>
                            ))
                        ) : (
                            <li>No ideas provided</li>
                        )}
                    </ul>
                </div>
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