import { z } from "zod";

export const APP_SHAPES = [
	"clover4-leaf",
	"cookie6-sided",
	"cookie9-sided",
	"flower",
	"puffy",
	"gem",
	"soft-burst",
	"arch",
	"pill",
	"sunny",
] as const;

export const StudioAppSchema = z.object({
	id: z.string(),
	name: z.string(),
	shape: z.enum(APP_SHAPES).default("clover4-leaf"),
	line: z.string().default(""),
});

export type StudioApp = z.infer<typeof StudioAppSchema>;

export const AppAskedSchema = z.object({ id: z.string() });

export const NothingAskedSchema = z.object({});

export const DRAFT_APP: StudioApp = {
	id: "new-app",
	name: "Untitled app",
	shape: "clover4-leaf",
	line: "Not created yet",
};
