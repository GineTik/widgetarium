import { z } from "widgetarium";
import type { Row } from "widgetarium";

const CellSchema = z.object({ label: z.string(), grow: z.number() });

const SketchRegionSchema = z.object({ name: z.string(), rows: z.array(z.array(CellSchema)) });

export const TemplateSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string(),
	widgets: z.array(z.string()),
	sketch: z.array(SketchRegionSchema),
});

export type Template = Row<z.infer<typeof TemplateSchema>>;

export type SketchRegion = z.infer<typeof SketchRegionSchema>;
