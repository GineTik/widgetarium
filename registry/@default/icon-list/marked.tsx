import { Icon } from "widgetarium/kit";
import { askedName } from "./asked-name";
import type { Entry, Look } from "./types";

const GLYPH_PX = 20;
const FALLBACK_ICON = "dot";

export function Marked({ entry, at, look }: { entry: Entry; at: number; look: Look }) {
	return look.isNumbered ? (
		<span className="wg-icon-list-number">{at + 1}</span>
	) : (
		<Icon name={askedName(entry.icon)} fallback={FALLBACK_ICON} size={GLYPH_PX} />
	);
}
