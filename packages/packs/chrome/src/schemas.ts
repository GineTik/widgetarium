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

export const ChromeAppSchema = z.object({
	id: z.string(),
	name: z.string(),
	shape: z.enum(APP_SHAPES),
	line: z.string(),
});

export const NoFieldsSchema = z.object({});

export const AppFieldsSchema = z.object({ app: z.string().default("") });

export const AppAskedSchema = z.object({ id: z.string() });

export type ChromeApp = z.infer<typeof ChromeAppSchema>;

export type NoFields = z.infer<typeof NoFieldsSchema>;

export type AppFields = z.infer<typeof AppFieldsSchema>;
