import { useRef, type ReactNode } from "react";
import { Button } from "widgetarium/kit";
import { useMeasuredHeight } from "./use-measured-height";
import { useShownPx } from "./use-shown-px";

export function Collapsed({
	collapsedPx,
	stepPx,
	children,
}: {
	collapsedPx: number;
	stepPx: number;
	children: ReactNode;
}) {
	const content = useRef<HTMLDivElement>(null);
	const [shownPx, setShownPx] = useShownPx(collapsedPx);
	const fullPx = useMeasuredHeight(content);

	const isLong = fullPx > collapsedPx;
	const isCut = isLong && fullPx > shownPx;
	const more = () => setShownPx(stepPx > 0 ? shownPx + stepPx : fullPx);
	const less = () => setShownPx(collapsedPx);

	return (
		<div className="wg-markdown-preview-collapsible">
			<div
				className="wg-markdown-preview-clip"
				data-cut={isCut}
				style={{ maxHeight: isLong ? Math.min(shownPx, fullPx) : undefined }}
			>
				<div ref={content}>{children}</div>
			</div>
			{isLong ? (
				<Button
					variant="ghost"
					size="s"
					className="wg-markdown-preview-more"
					data-part="more"
					onClick={isCut ? more : less}
				>
					{isCut ? "Show more" : "Show less"}
				</Button>
			) : null}
		</div>
	);
}
