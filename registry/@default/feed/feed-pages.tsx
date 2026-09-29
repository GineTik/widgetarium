import { SlotList } from "widgetarium/kit";
import { FeedPage } from "./feed-page";
import type { Drawn, Items } from "./types";

type PagesProps = { items: Items; Drawn: Drawn; size: number; pages: number; onMore: () => void };

const CSS = `
.wg-feed { display: flex; flex-direction: column; flex: 1 1 auto; min-width: 0; min-height: 0; overflow: auto; }
.wg-feed-more { flex: none; height: 1px; }
.wg-feed-said { margin: 0; color: var(--wg-kit-text-muted); }
`;

export function FeedPages({ items, Drawn, size, pages, onMore }: PagesProps) {
	return (
		<div className="wg-feed">
			<style>{CSS}</style>
			<SlotList slot={Drawn}>
				{Array.from({ length: pages }, (_, page) => (
					<FeedPage
						key={page}
						items={items}
						Drawn={Drawn}
						offset={page * size}
						limit={size}
						isLast={page === pages - 1}
						onMore={onMore}
					/>
				))}
			</SlotList>
		</div>
	);
}
