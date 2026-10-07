import type { ToneName } from "./tones";
import type { WordChoice } from "../utils/surface";

export type ChatAlign = "start" | "end";

export const CHAT_ALIGN_WORD: WordChoice<ChatAlign> = {
	kind: "chat alignment",
	allowed: ["start", "end"],
	fallback: "start",
};

export type BubbleVariant = "default" | "secondary" | "muted" | "tinted" | "outline" | "ghost" | "destructive";

export const BUBBLE_VARIANTS: readonly BubbleVariant[] = [
	"default",
	"secondary",
	"muted",
	"tinted",
	"outline",
	"ghost",
	"destructive",
];

export const BUBBLE_VARIANT_WORD: WordChoice<BubbleVariant> = {
	kind: "bubble variant",
	allowed: BUBBLE_VARIANTS,
	fallback: "default",
};

export interface BubblePlate {
	readonly type: "group" | "none";
	readonly tone?: ToneName;
	readonly look: string;
}

export const BUBBLE_PLATES: Readonly<Record<BubbleVariant, BubblePlate>> = {
	default: { type: "group", tone: "accent", look: "is-solid" },
	secondary: { type: "group", look: "" },
	muted: { type: "group", look: "is-muted" },
	tinted: { type: "group", tone: "accent", look: "" },
	outline: { type: "none", look: "is-outline" },
	ghost: { type: "none", look: "is-ghost" },
	destructive: { type: "group", tone: "error", look: "" },
};

export type ReactionSide = "top" | "bottom";

export const REACTION_SIDE_WORD: WordChoice<ReactionSide> = {
	kind: "reaction side",
	allowed: ["top", "bottom"],
	fallback: "bottom",
};

export type AttachmentState = "idle" | "uploading" | "processing" | "error" | "done";

export type AttachmentSize = "default" | "sm" | "xs";

export type AttachmentOrientation = "horizontal" | "vertical";

export type AttachmentMediaVariant = "icon" | "image";

export const ATTACHMENT_STATE_WORD: WordChoice<AttachmentState> = {
	kind: "attachment state",
	allowed: ["idle", "uploading", "processing", "error", "done"],
	fallback: "done",
};

export const ATTACHMENT_SIZE_WORD: WordChoice<AttachmentSize> = {
	kind: "attachment size",
	allowed: ["default", "sm", "xs"],
	fallback: "default",
};

export const ATTACHMENT_ORIENTATION_WORD: WordChoice<AttachmentOrientation> = {
	kind: "attachment orientation",
	allowed: ["horizontal", "vertical"],
	fallback: "horizontal",
};

export const ATTACHMENT_MEDIA_WORD: WordChoice<AttachmentMediaVariant> = {
	kind: "attachment media variant",
	allowed: ["icon", "image"],
	fallback: "icon",
};

export const SUMMARY_ICON_PX = 14;

export const ATTACHMENT_BUSY_STATES: readonly AttachmentState[] = ["uploading", "processing"];

export type ToolStage = "running" | "approval" | "done" | "error" | "denied";

export const TOOL_STAGE_LABELS: Readonly<Record<ToolStage, string>> = {
	running: "Running",
	approval: "Waiting for approval",
	done: "Done",
	error: "Failed",
	denied: "Denied",
};

export const TOOL_STAGE_TONES: Readonly<Record<ToolStage, ToneName>> = {
	running: "info",
	approval: "warning",
	done: "success",
	error: "error",
	denied: "neutral",
};

export const REASONING_LABEL = "Reasoning";

export const REASONING_LIVE_LABEL = "Thinking";

export const TOOL_INPUT_LABEL = "Input";

export const TOOL_OUTPUT_LABEL = "Output";

export const UNNAMED_FILE = "Attached file";
