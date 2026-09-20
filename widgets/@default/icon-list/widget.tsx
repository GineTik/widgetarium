import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createWidget, defineManifest, defineProp, useData } from "widgetarium";
import { Button, cx, Icon, toneClass } from "widgetarium/kit";
import type { Row, Text, ViewHost } from "widgetarium";

type Entry = { text: Text; icon?: string; tone?: string };

const PAGE_SIZE = 100;
const GLYPH_PX = 20;
const FALLBACK_ICON = "dot";

type Look = { isNumbered: boolean; isSolid: boolean };

const NOTHING = "Nothing on this list yet.";
const SHOW_MORE = "Show more";
// TODO: spell the tones from TONE_NAMES once a card can be written with the kit loaded
const TONE_HINT =
	"The colour behind the icon: neutral, accent, success, warning, error, info, note, standout or highlight. Any other word draws neutral.";
const ICON_HINT =
	"The icon inside the disc, under the name the icon picker gives it — tick, close, alarm-clock. A name nothing answers to draws a dot.";
const TEXT_HINT = "The line itself, as markdown: **bold**, `code`, a [[link]] and the rest all draw.";

const askedName = (asked: unknown) =>
	String(asked ?? "")
		.trim()
		.toLowerCase();

function MarkdownLine({ host, text }: { host: ViewHost; text: string }) {
	const body = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		if (!body.current || !host.can.renderMarkdown) return undefined;
		return host.ui.renderMarkdown(body.current, text);
	}, [host, text]);

	if (!host.can.renderMarkdown) return <div className="wg-icon-list-text">{text}</div>;
	return <div ref={body} className="wg-icon-list-text markdown-rendered" />;
}

function Marked({ entry, at, look }: { entry: Entry; at: number; look: Look }) {
	if (look.isNumbered) return <span className="wg-icon-list-number">{at + 1}</span>;
	return <Icon name={askedName(entry.icon)} fallback={FALLBACK_ICON} size={GLYPH_PX} />;
}

function EntryRow({ host, entry, at, look }: { host: ViewHost; entry: Entry; at: number; look: Look }) {
	return (
		<div className="wg-icon-list-row">
			<span
				className={cx("wg-icon-list-mark", "wg-kit-tone", look.isSolid && "is-solid", toneClass(askedName(entry.tone)))}
			>
				<Marked entry={entry} at={at} look={look} />
			</span>
			<MarkdownLine host={host} text={String(entry.text ?? "")} />
		</div>
	);
}

export const manifest = defineManifest({
	title: "Icon list",
	description: "A list whose every line carries its own icon in a disc of its own colour, the line itself markdown.",
	keywords: [
		"list",
		"icon",
		"bullet",
		"points",
		"pros",
		"cons",
		"checklist",
		"steps",
		"rules",
		"summary",
		"takeaways",
		"legend",
		"status",
		"colour",
		"markdown",
	],
	role: "collection",
	size: { collapseBelowPx: 180, stackBelowPx: 240 },
	preview: {
		size: { w: 5, h: 4 },
		props: {
			entries: {
				rows: [
					{ icon: "tick", tone: "success", text: "**A list — yes.** More columns visible, more rows in view." },
					{ icon: "close", tone: "error", text: "**Prose — no.** Past ~75 characters the eye loses the next line." },
					{
						icon: "alarm-clock",
						tone: "warning",
						text: "**A table — it depends.** Wide helps until the columns thin.",
					},
				],
			},
		},
	},
	props: {
		entries: defineProp<Entry[]>()({
			label: "Lines",
			hint: "One line per point. Each carries its own icon and colour, and reads as markdown.",
			default: [
				{ icon: "tick", tone: "success", text: "**A list — yes.** More columns visible, more rows in view." },
				{ icon: "close", tone: "error", text: "**Prose — no.** Past ~75 characters the eye loses the next line." },
			],
			describes: {
				text: { label: "Text", hint: TEXT_HINT, type: "text", required: true, aka: ["body", "line", "description"] },
				icon: { label: "Icon", hint: ICON_HINT, type: "line", aka: ["glyph", "symbol"] },
				tone: {
					label: "Colour",
					hint: TONE_HINT,
					type: "line",
					aka: ["colour", "color", "status"],
				},
			},
		}),
		numbered: defineProp<boolean>()({
			label: "Number the lines",
			hint: "Off, every line shows its own icon. On, the discs count the lines instead — 1, 2, 3 — and keep their colours.",
			default: false,
		}),
		solid: defineProp<boolean>()({
			label: "Fill the discs",
			hint: "Off, a disc wears a pale wash of its colour. On, it is filled with the colour itself and the icon or number turns white.",
			default: false,
		}),
	},
});

export default createWidget(manifest, ({ entries, numbered, solid, host }) => {
	const [shown, setShown] = useState(PAGE_SIZE);
	useEffect(() => setShown(PAGE_SIZE), [entries.id]);

	const listed = useData(entries.list, { offset: 0, limit: shown });
	const look = { isNumbered: useData(numbered.get).data === true, isSolid: useData(solid.get).data === true };

	if (listed.failure) return <p className="wg-icon-list-said">{listed.failure}</p>;
	if (!listed.isLoading && listed.data.length === 0) return <p className="wg-icon-list-said">{NOTHING}</p>;

	return (
		<div className="wg-icon-list">
			{listed.data.map((row: Row<Entry>, at: number) => (
				<EntryRow key={row.ref} host={host} entry={row} at={at} look={look} />
			))}
			{(listed.total ?? 0) > listed.data.length ? (
				<Button
					size="s"
					variant="ghost"
					className="wg-icon-list-more"
					data-part="more"
					onClick={() => setShown(shown + PAGE_SIZE)}
				>
					{SHOW_MORE}
				</Button>
			) : null}
		</div>
	);
});
