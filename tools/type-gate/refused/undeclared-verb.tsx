import { ICrudGateway, IValueGateway, createWidget, z } from "widgetarium";
import type { PropsOf } from "widgetarium";

const Entry = z.object({ title: z.string() });

const Checklist = createWidget({
	inject: {
		heading: IValueGateway.of(z.string().default("To do")).pick("get"),
		entries: ICrudGateway.of(Entry).pick("create"),
	},
	draw: () => null,
});

declare const drawn: PropsOf<typeof Checklist>;

export const removing = drawn.entries.remove;
export const writingAValue = drawn.heading.update;
export const removingMany = drawn.entries.removeMany;
export const upserting = drawn.entries.upsert;
