import { useData, type Row } from "widgetarium";
import { FeedItem } from "./feed-item";
import { MoreWhenSeen } from "./more-when-seen";
import type { Drawn, Item, Items } from "./types";

type PageProps = { items: Items; Drawn: Drawn; offset: number; limit: number; isLast: boolean; onMore: () => void };

export function FeedPage({ items, Drawn, offset, limit, isLast, onMore }: PageProps) {
	const listed = useData(items.list, { offset, limit });
	const hasMore = isLast && listed.data.length === limit && (listed.total ?? 0) > offset + limit;

	return (
		<>
			{listed.data.map((row) => (
				<FeedItem key={row.ref} items={items} row={row as Row<Item>} Drawn={Drawn} />
			))}
			{hasMore ? <MoreWhenSeen onSeen={onMore} /> : null}
		</>
	);
}
