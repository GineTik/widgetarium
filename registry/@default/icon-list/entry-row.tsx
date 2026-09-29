import { cn, toneClass } from "widgetarium/kit";
import type { ViewHost } from "widgetarium";
import { askedName } from "./asked-name";
import { MarkdownLine } from "./markdown-line";
import { Marked } from "./marked";
import type { Entry, Look } from "./types";

export function EntryRow({ host, entry, at, look }: { host: ViewHost; entry: Entry; at: number; look: Look }) {
	return (
		<div className="wg-icon-list-row">
			<span
				className={cn("wg-icon-list-mark", "wg-kit-tone", look.isSolid && "is-solid", toneClass(askedName(entry.tone)))}
			>
				<Marked entry={entry} at={at} look={look} />
			</span>
			<MarkdownLine host={host} text={String(entry.text ?? "")} />
		</div>
	);
}
