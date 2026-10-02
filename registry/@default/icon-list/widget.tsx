import { useEffect, useState } from "react";
import { IHost, IQuery, createWidget, defineLayout, defineMetadata, useData, z } from "widgetarium";
import { Button } from "widgetarium/kit";
import type { Row } from "widgetarium";
import { EntryRow } from "./entry-row";
import type { Entry } from "./types";

export const EntrySchema = z.object({
	text: z.string().meta({ aka: ["body", "line", "description"] }),
	icon: z
		.string()
		.optional()
		.meta({ aka: ["glyph", "symbol"] }),
	tone: z
		.string()
		.optional()
		.meta({ aka: ["colour", "color", "status"] }),
});

const PAGE_SIZE = 100;

const NOTHING = "Nothing on this list yet.";
const SHOW_MORE = "Show more";
// TODO: spell the tones from TONE_NAMES once a card can be written with the kit loaded
const TONE_HINT =
	"The colour behind the icon: neutral, accent, success, warning, error, info, note, standout or highlight. Any other word draws neutral.";
const ICON_HINT =
	"The icon inside the disc, under the name the icon picker gives it — tick, close, alarm-clock. A name nothing answers to draws a dot.";
const TEXT_HINT = "The line itself, as markdown: **bold**, `code`, a [[link]] and the rest all draw.";

const IconList = createWidget({
	inject: {
		getEntries: IQuery.of(
			z.array(EntrySchema).default([
				{ icon: "tick", tone: "success", text: "**A list — yes.** More columns visible, more rows in view." },
				{ icon: "close", tone: "error", text: "**Prose — no.** Past ~75 characters the eye loses the next line." },
			]),
		),
		getNumbered: IQuery.of(z.boolean().default(false)),
		getSolid: IQuery.of(z.boolean().default(false)),
		host: IHost,
	},
	draw: ({ getEntries, getNumbered: numbered, getSolid: solid, host }) => {
		const [shown, setShown] = useState(PAGE_SIZE);
		useEffect(() => setShown(PAGE_SIZE), [getEntries]);

		const listed = useData(getEntries, { offset: 0, limit: shown });
		const look = { isNumbered: numbered, isSolid: solid };

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
	},
});

export const metadata = defineMetadata(IconList, {
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
	preview: {
		size: { w: 5, h: 4 },
		props: {
			getEntries: {
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
		getEntries: {
			label: "Lines",
			aka: ["entries"],
			hint: "One line per point. Each carries its own icon and colour, and reads as markdown.",
			describes: {
				text: { label: "Text", hint: TEXT_HINT, type: "text", required: true },
				icon: { label: "Icon", hint: ICON_HINT, type: "line" },
				tone: { label: "Colour", hint: TONE_HINT, type: "line" },
			},
		},
		getNumbered: {
			label: "Number the lines",
			aka: ["numbered"],
			hint: "Off, every line shows its own icon. On, the discs count the lines instead — 1, 2, 3 — and keep their colours.",
		},
		getSolid: {
			label: "Fill the discs",
			aka: ["solid"],
			hint: "Off, a disc wears a pale wash of its colour. On, it is filled with the colour itself and the icon or number turns white.",
		},
	},
});

export const layout = defineLayout({
	role: "collection",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 180, stackBelowPx: 240 },
});

export default IconList;
