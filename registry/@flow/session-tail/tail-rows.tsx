import { useMemo } from "react";
import type { Row } from "widgetarium";
import { SlotList } from "widgetarium/kit";
import { BackToEnd } from "./back-to-end";
import { CSS } from "./style";
import type { LogLine, TailProps } from "./types";
import { useBehind } from "./use-behind";
import { useFollowing } from "./use-following";
import { useStuckToEnd } from "./use-stuck-to-end";

type Drawn = NonNullable<TailProps["line"]>;

type RowsProps = { rows: Row<LogLine>[]; total: number | null; following: TailProps["following"]; Line: Drawn };

const LIVE_LOG = "Session log";

export function TailRows({ rows, total, following, Line }: RowsProps) {
	const { isFollowing, setFollowing } = useFollowing(following);
	const oldestFirst = useMemo(() => [...rows].reverse(), [rows]);
	const newest = oldestFirst[oldestFirst.length - 1];
	const { scroller, onScroll } = useStuckToEnd(isFollowing, `${oldestFirst.length}|${newest?.ref ?? ""}`, setFollowing);
	const behind = useBehind(isFollowing, total);

	return (
		<div className="wg-tail">
			<style>{CSS}</style>
			<div
				className="wg-tail-scroll"
				ref={scroller}
				onScroll={onScroll}
				role="log"
				aria-label={LIVE_LOG}
				aria-live="polite"
				aria-relevant="additions"
			>
				<SlotList
					slot={Line}
					rows={oldestFirst}
					keyOf={(row: Row<LogLine>) => row.ref}
					give={(row: Row<LogLine>) => ({ entry: row })}
				/>
			</div>
			{isFollowing ? null : <BackToEnd behind={behind} onPress={() => setFollowing(true)} />}
		</div>
	);
}
