import { z, type PropsOf, type Row, type Slot } from "widgetarium";
import type FeedWidget from "./widget";
import type { ItemSchema } from "./widget";

export type Item = z.infer<typeof ItemSchema>;
export type Given = { getSource: Row<Item> };
export type ItemSlot = Slot<Given>;
export type Drawn = NonNullable<ItemSlot>;

export type Items = PropsOf<typeof FeedWidget>["getItems"];
