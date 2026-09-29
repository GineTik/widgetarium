import { Button } from "widgetarium/kit";
import { useClamped } from "./use-clamped";

const SHOW_REST = "Show the rest";
const SHOW_LESS = "Show less";

export function Reason({ text }: { text: string }) {
	const { body, isOpen, isOverflowing, toggle } = useClamped(text);
	if (!text) return null;
	return (
		<div className="wg-qa-block-reason-box">
			<p ref={body} className="wg-qa-block-reason" data-clamped={isOpen ? "no" : "yes"}>
				{text}
			</p>
			{isOverflowing ? (
				<Button size="s" variant="ghost" onClick={toggle}>
					{isOpen ? SHOW_LESS : SHOW_REST}
				</Button>
			) : null}
		</div>
	);
}
