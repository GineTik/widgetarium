import { z } from "zod";
import { SPEC_FOLDER } from "./app-spec.js";

export const DESIGN_FOLDER = "design";
export const DESIGN_FILE = "canvas.json";
export const REFERENCES_FOLDER = "references";

const NOT_JSON = "the canvas is not JSON: {why}";

export type ScreenState = z.infer<typeof StateSchema>;

export function statesOf(screen: z.infer<typeof ScreenSchema>): ScreenState[] {
	return screen.states ?? [{ name: screen.name, file: screen.file ?? "" }];
}

export type Design = z.infer<typeof DesignSchema>;

export type DesignRead =
	{ readonly design: Design; readonly refusal?: undefined } | { readonly design?: undefined; readonly refusal: string };

const VAULT_BINDING = /"implementation":"(@obsidian\/[^"]+)"/;

export function vaultBindingOf(board: unknown): string | null {
	return JSON.stringify(board).match(VAULT_BINDING)?.[1] ?? null;
}

export function isSafeAppName(app: string): boolean {
	return app.trim() !== "" && !app.includes("/") && !app.includes("\\") && !app.includes("..");
}

export function designFolderOf(app: string): string {
	return `${SPEC_FOLDER}/${app}/${DESIGN_FOLDER}`;
}

export function designPathOf(app: string): string {
	return `${designFolderOf(app)}/${DESIGN_FILE}`;
}

export function screenPathOf(app: string, file: string): string {
	return `${designFolderOf(app)}/${file}`;
}

export function referencePathOf(app: string, file: string): string {
	return `${designFolderOf(app)}/${REFERENCES_FOLDER}/${file}`;
}

export function referenceFileOf(name: string, stamp: string): string {
	const cleaned = name.replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/g, "");
	return `${stamp}-${cleaned || "photo"}`;
}

export type ReferenceEntry = z.infer<typeof ReferenceSchema>;

export function withReferencesAdded(text: string | null, entries: readonly ReferenceEntry[]): string {
	const held: unknown = text === null ? {} : JSON.parse(text);
	const canvas = typeof held === "object" && held !== null && !Array.isArray(held) ? { ...held } : {};
	const kept: unknown = Reflect.get(canvas, "references");
	const references = [...(Array.isArray(kept) ? kept : []), ...entries];
	const screens: unknown = Reflect.get(canvas, "screens");
	return `${JSON.stringify({ ...canvas, screens: Array.isArray(screens) ? screens : [], references }, null, 2)}\n`;
}

export function screenFileOf(screen: string, state: string | undefined): string {
	const named = state ? `${screen} · ${state}` : screen;
	return `${named.replace(/[\\/:*?"<>|]+/g, "-").trim()}.md`;
}

export function screenNoteOf(widget: string, values: Readonly<Record<string, string>>): string {
	const props = Object.entries(values).map(
		([prop, value]) =>
			`      ${prop}: { implementation: "@core/typed-value", fields: { value: ${JSON.stringify(value)} } }`,
	);
	return [
		"---",
		"widgetarium: { kind: screen }",
		"---",
		"",
		"```widgetarium",
		"v: 2",
		"mode: expanded",
		"tiles:",
		"  - id: screen",
		`    widget: ${JSON.stringify(widget)}`,
		...(props.length > 0 ? ["    props:", ...props] : []),
		"layout:",
		"  dir: row",
		"  of:",
		"    - dir: column",
		"      keep: true",
		"      of: [{ id: screen }]",
		"```",
		"",
	].join("\n");
}

export function withScreenAdded(text: string | null, screen: string, state: string | undefined, file: string): string {
	const held: unknown = text === null ? {} : JSON.parse(text);
	const canvas = typeof held === "object" && held !== null && !Array.isArray(held) ? { ...held } : {};
	const kept: unknown = Reflect.get(canvas, "screens");
	const screens: unknown[] = Array.isArray(kept) ? [...kept] : [];
	const at = screens.findIndex((one) => typeof one === "object" && one !== null && Reflect.get(one, "name") === screen);
	const placed = at === -1 ? undefined : screens[at];
	screens.splice(at === -1 ? screens.length : at, at === -1 ? 0 : 1, screenWith(placed, screen, state, file));
	const references: unknown = Reflect.get(canvas, "references");
	return `${JSON.stringify({ ...canvas, screens, references: Array.isArray(references) ? references : [] }, null, 2)}\n`;
}

export function readDesign(text: string): DesignRead {
	let held: unknown;
	try {
		held = JSON.parse(text);
	} catch (failure) {
		return { refusal: NOT_JSON.replace("{why}", failure instanceof Error ? failure.message : String(failure)) };
	}
	const parsed = DesignSchema.safeParse(held);
	if (parsed.success) return { design: parsed.data };
	const [issue] = parsed.error.issues;
	return { refusal: `${issue?.path.join(".") || "the canvas"}: ${issue?.message ?? "does not fit"}` };
}

const ScreenFileSchema = z
	.string()
	.trim()
	.min(1)
	.regex(/\.md$/, { message: "a screen's file is a .md note holding one widgetarium block" })
	.refine((file) => !file.includes("/") && !file.includes("\\") && !file.includes(".."), {
		message: "a screen's file is a name inside the design folder, never a path",
	});

const ReferenceFileSchema = z.object({
	file: z
		.string()
		.trim()
		.regex(/\.(png|jpe?g|webp|gif|avif)$/i, { message: "a reference is a picture: png, jpg, webp, gif or avif" })
		.refine((file) => !file.includes("/") && !file.includes("\\") && !file.includes(".."), {
			message: "a reference is a name inside the references folder, never a path",
		}),
	why: z.string().trim().min(1).optional(),
});

const ReferenceUrlSchema = z.object({
	url: z.url({ protocol: /^https$/, message: "a reference from the web is an https address" }),
	why: z.string().trim().min(1).optional(),
});

const ReferenceSchema = z.union([ReferenceFileSchema, ReferenceUrlSchema]);

const StateSchema = z.object({ name: z.string().trim().min(1), file: ScreenFileSchema });

const ScreenSchema = z
	.object({
		name: z.string().trim().min(1),
		file: ScreenFileSchema.optional(),
		states: z.array(StateSchema).min(1).optional(),
	})
	.refine((screen) => (screen.file === undefined) !== (screen.states === undefined), {
		message: "a screen names one file, or its states, each with a file of its own",
	});

const DesignSchema = z
	.object({
		screens: z.array(ScreenSchema).default([]),
		references: z.array(ReferenceSchema).default([]),
	})
	.refine((design) => design.screens.length + design.references.length > 0, {
		message: "a design shows at least one screen or one reference",
	});

function screenWith(placed: unknown, screen: string, state: string | undefined, file: string): unknown {
	if (!state) return { name: screen, file };
	const kept: unknown = typeof placed === "object" && placed !== null ? Reflect.get(placed, "states") : undefined;
	const states = (Array.isArray(kept) ? kept : []).filter(
		(one) => !(typeof one === "object" && one !== null && Reflect.get(one, "name") === state),
	);
	return { name: screen, states: [...states, { name: state, file }] };
}
