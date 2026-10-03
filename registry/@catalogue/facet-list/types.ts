import { z } from "widgetarium";
import type { Row } from "widgetarium";

export const FacetSchema = z.object({
	name: z.string(),
	label: z.string(),
	count: z.number().optional(),
	icon: z.string().optional(),
	mark: z.string().optional(),
	tone: z.string().optional(),
});

export type Facet = Row<z.infer<typeof FacetSchema>>;
