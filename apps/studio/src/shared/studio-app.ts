import { z } from "zod";

export const StudioAppSchema = z.object({
	id: z.string(),
	name: z.string(),
	line: z.string().default(""),
});

export type StudioApp = z.infer<typeof StudioAppSchema>;

export const AppAskedSchema = z.object({ id: z.string() });

export const NothingAskedSchema = z.object({});

export const DRAFT_APP: StudioApp = {
	id: "new-app",
	name: "Untitled app",
	line: "Not created yet",
};
