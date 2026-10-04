import { z } from "zod";
import { SPEC_FOLDER } from "./app-spec.js";

export const DESIGN_FOLDER = "design";
export const DESIGN_FILE = "canvas.json";

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

export const DesignSchema = z.object({
	screens: z.array(ScreenSchema).min(1, { message: "a design shows at least one screen" }),
});
