import { z, type DrawnProps, type Row, type Slot } from "widgetarium";
import type { ItemSchema, props } from "./widget";

export type Item = z.infer<typeof ItemSchema>;
export type Given = { getSource: Row<Item> };
export type ItemSlot = Slot<Given>;
export type Drawn = NonNullable<ItemSlot>;

export type Items = DrawnProps<typeof props>["getItems"];
