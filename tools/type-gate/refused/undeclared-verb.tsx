import { ICrudGateway, IValueGateway, defineProps, z } from "widgetarium";
import type { DrawnProps } from "widgetarium";

const Entry = z.object({ title: z.string() });

const props = defineProps({
	heading: IValueGateway.of(z.string().default("To do")).pick("get"),
	entries: ICrudGateway.of(Entry).pick("create"),
});

declare const drawn: DrawnProps<typeof props>;

export const removing = drawn.entries.remove;
export const writingAValue = drawn.heading.update;
export const removingMany = drawn.entries.removeMany;
export const upserting = drawn.entries.upsert;
