import type { Row } from "widgetarium";
import type { Drawn, Item, Items } from "./types";
import { useItemSource } from "./use-item-source";

export function FeedItem({ items, row, Drawn }: { items: Items; row: Row<Item>; Drawn: Drawn }) {
	return <Drawn getSource={useItemSource(items, row)} />;
}
