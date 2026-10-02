import { useData, type Row } from "widgetarium";
import { MoreWhenSeen } from "widgetarium/kit";
import type { Drawn, Item, Items } from "./types";

type PageProps = { items: Items; Drawn: Drawn; offset: number; limit: number; isLast: boolean; onMore: () => void };

export function FeedPage({ items, Drawn, offset, limit, isLast, onMore }: PageProps) {
	const listed = useData(items, { offset, limit });
	const hasMore = isLast && listed.data.length === limit && (listed.total ?? 0) > offset + limit;

	return (
		<>
			{listed.data.map((row) => (
				<Drawn key={row.ref} getSource={row as Row<Item>} />
			))}
			{hasMore ? <MoreWhenSeen onSeen={onMore} className="wg-feed-more" /> : null}
		</>
	);
}
