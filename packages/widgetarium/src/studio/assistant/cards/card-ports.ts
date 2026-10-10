import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";

export type AppFiles = Pick<AssistantPort, "readAppFile" | "onAppFile" | "changeAppFile">;

export type JobsPort = Pick<AssistantPort, "jobs" | "onJobs" | "startJob" | "stopJob">;
