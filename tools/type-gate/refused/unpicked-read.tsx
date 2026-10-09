import { ICrudGateway, createWidget } from "widgetarium";
import { z } from "zod";
import type { PropsOf } from "widgetarium";

const Entry = z.object({ title: z.string() });

const Entries = createWidget({
	inject: { entries: ICrudGateway.of(Entry).pick("update") },
	draw: () => null,
});

declare const drawn: PropsOf<typeof Entries>;

export const listing = drawn.entries.list;
