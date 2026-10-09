import { MoreWhenSeen, SlotList } from "widgetarium/kit";
import type { Drawn, Items } from "./types";

type ListProps = { items: Items; Drawn: Drawn; hasMore: boolean; onMore: () => void };

const CSS = `
.wg-feed { display: flex; flex-direction: column; flex: 1 1 auto; min-width: 0; min-height: 0; overflow: auto; }
.wg-feed-more { flex: none; height: 1px; }
.wg-feed-said { margin: 0; color: var(--wg-kit-text-muted); }
`;

export function FeedList({ items, Drawn, hasMore, onMore }: ListProps) {
	return (
		<div className="wg-feed">
			<style>{CSS}</style>
			<SlotList slot={Drawn}>
				{items.map((row) => (
					<Drawn key={row.ref} getSource={row} />
				))}
				{hasMore ? <MoreWhenSeen onSeen={onMore} className="wg-feed-more" /> : null}
			</SlotList>
		</div>
	);
}
