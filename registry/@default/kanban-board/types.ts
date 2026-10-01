import { z, type DrawnProps, type Navigation, type RecordRef, type ViewHost } from "widgetarium";
import type { ToneName } from "widgetarium/kit";
import type { TaskSchema, props } from "./widget";

type TaskRecord = z.infer<typeof TaskSchema>;

export type TaskRow = TaskRecord & { ref: RecordRef };

export type TaskProps = NonNullable<TaskRecord["props"]>;

export type KanbanColumn = { title: string; rows: TaskRow[] };

export type Choice = { value: string; note?: string };

export type Anchor = {
	kind: string;
	icon: string;
	word: string;
	required?: boolean;
	choices?: Choice[];
	tones?: Readonly<Record<string, ToneName>>;
};

export type Tones = Record<string, string>;

export type Dragging = { row: TaskRow | null; pick: (row: TaskRow) => void; drop: () => void };

export type RenderMarkdown = ViewHost["ui"]["renderMarkdown"];

export type KanbanProps = DrawnProps<typeof props>;

// TRADE-OFF: nothing invented — an absent field must stay absent, or the card cannot tell it from a value
export type CardFace = {
	title: unknown;
	tags: string[];
	tagTones: unknown;
	priority: unknown;
	status: unknown;
	progress: unknown;
	initials: string[];
	due?: string;
	files?: number;
};

// TRADE-OFF: fetched when the note opens — listing re-runs on every vault event, so rows carry no body
export type DescriptionProps = {
	path: string;
	read: (given: { path: string }) => Promise<TaskRecord | null>;
	write: (given: { path: string }, patch: { body: string }) => Promise<TaskRecord | null>;
	render?: RenderMarkdown | undefined;
	canPreview: boolean;
	canEdit: boolean;
};

export type TagRowProps = {
	tags: string[];
	tones: Tones;
	roster: string[];
	onWrite: (tags: string[], tones: Tones) => void;
};

export type TaskDialogProps = {
	tasks: KanbanProps["tasks"];
	rows: TaskRow[];
	columns: string[];
	properties: string[];
	onBoard: string;
	opened: KanbanProps["opened"];
	openedRef: unknown;
	today: Date;
	onAddProperty?: ((names: string[]) => void) | undefined;
	host?: ViewHost | undefined;
	navigator?: Navigation | undefined;
};
