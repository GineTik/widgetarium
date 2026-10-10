import { z } from "zod";
import type { Row } from "@widgetarium/core/gateway/contract.js";

export const FacetSchema = z.object({
	name: z.string(),
	label: z.string(),
	count: z.number().optional(),
	icon: z.string().optional(),
	mark: z.string().optional(),
	tone: z.string().optional(),
});

export type Facet = Row<z.infer<typeof FacetSchema>>;
