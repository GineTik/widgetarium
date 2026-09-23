import { createWidget, defineManifest, defineProp, fieldOf, textOf, useData } from "widgetarium";
import { useLayoutEffect, useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";

const ALL_OPTIONS = 200;
const UNNAMED = "Untitled";
const LABEL = "label";
const VALUE = "value";
const RECORD_NAME = "name";
const HIDDEN = "hidden";

const STEP_BY_KEY: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };
const END_BY_KEY: Record<string, number> = { Home: 0, End: -1 };

const CSS = `
.wg-underline-tabs {
	display: flex;
	align-items: flex-end;
	min-width: 0;
	border-bottom: 1px solid var(--wg-kit-group-line);
}

.wg-underline-tabs .wg-ult-row {
	display: flex;
	align-items: stretch;
	gap: var(--wg-gap-parts);
	min-width: 0;
	max-width: 100%;
	overflow-x: auto;
	overflow-y: hidden;
	scrollbar-width: none;
}

.wg-underline-tabs .wg-ult-row::-webkit-scrollbar { display: none; }

.wg-underline-tabs button {
	flex: none;
	position: relative;
	min-height: 42px;
	min-width: 42px;
	max-width: 14rem;
	padding: 0 var(--size-4-3, 12px);
	border: none;
	border-radius: 0;
	background: none;
	box-shadow: none;
	cursor: pointer;
	font-family: var(--font-interface);
	font-size: var(--font-ui-small, 14px);
	font-weight: var(--font-normal, 400);
	color: var(--wg-kit-text-muted);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	transition: color var(--wg-quick) var(--wg-ease);
}

.wg-underline-tabs button:hover { color: var(--wg-kit-text); }

.wg-underline-tabs button[aria-selected="true"] {
	color: var(--wg-kit-text);
	font-weight: var(--font-semibold, 600);
}

.wg-underline-tabs button::after {
	content: "";
	position: absolute;
	left: 0;
	right: 0;
	bottom: -1px;
	height: 2px;
	border-radius: var(--wg-kit-pill);
	background: var(--wg-kit-accent);
	transform: scaleX(0);
	transition: transform var(--wg-grow) var(--wg-spring);
}

.wg-underline-tabs button[aria-selected="true"]::after { transform: scaleX(1); }
`;

type Held = Record<string, unknown> & { props?: Record<string, unknown> };
type Option = { ref: string; label: string; value: string };

function optionOf(ref: string, held: Held): Option {
	const label = textOf(held, LABEL) || textOf(held, RECORD_NAME);
	return { ref, label, value: textOf(held, VALUE) || label };
}

function steppedTo(key: string, at: number, count: number): number | null {
	const step = STEP_BY_KEY[key];
	if (step !== undefined) return (at + step + count) % count;
	const end = END_BY_KEY[key];
	if (end !== undefined) return (end + count) % count;
	return null;
}

function useActiveInView(rowRef: RefObject<HTMLDivElement | null>, activeRef: string) {
	useLayoutEffect(() => {
		rowRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
	}, [activeRef]);
}

export const manifest = defineManifest({
	title: "Underline tabs",
	description: "A row of section names with the open one underlined, picking which view a view box draws.",
	keywords: [
		"tabs",
		"underline",
		"sections",
		"navigation",
		"switch",
		"strip",
		"record",
		"summary",
		"overview",
		"views",
		"steer",
		"header",
	],
	role: "navigation",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 120, stackBelowPx: 240 },
	preview: {
		size: { w: 4, h: 1 },
		props: { options: { rows: [{ label: "Summary" }, { label: "Plan" }, { label: "Implementation" }] } },
	},
	props: {
		options: defineProp<Held[]>()({
			label: "Options",
			hint: "Every section is a record. Bind a view box and it offers the views it holds.",
			wants: "@default/view-group/holds",
			default: [{ label: "Summary" }, { label: "Plan" }, { label: "Implementation" }],
			describes: {
				label: { label: "Label", type: "text", required: true },
				value: { label: "Value", type: "text" },
				hidden: { label: "Hidden", type: "boolean" },
			},
		}),
		selection: defineProp<string>()({
			label: "Open section",
			hint: "Which section is open. Bind the view box's own selection and the two move together.",
			of: "options",
			field: "value",
			fallback: "first",
			wants: "@default/view-group/selection",
			writes: ["update"],
		}),
	},
});

export default createWidget(manifest, ({ options, selection }) => {
	const listed = useData(options.list, { limit: ALL_OPTIONS });
	const chosen = useData(selection.get).data;
	const rowRef = useRef<HTMLDivElement | null>(null);

	const rows: Option[] = listed.data.filter((held) => !fieldOf(held, HIDDEN)).map((held) => optionOf(held.ref, held));
	const active = rows.find((row) => row.value === chosen) ?? rows[0] ?? null;

	useActiveInView(rowRef, active?.ref ?? "");

	if (rows.length === 0) return null;

	const onKeys = (event: ReactKeyboardEvent<HTMLDivElement>) => {
		const from = rows.findIndex((row) => row.ref === active?.ref);
		const at = steppedTo(event.key, Math.max(from, 0), rows.length);
		const picked = at === null ? null : rows[at];
		if (at === null || !picked) return;
		event.preventDefault();
		selection.update(picked.ref);
		event.currentTarget.querySelectorAll("button")[at]?.focus();
	};

	return (
		<div className="wg-underline-tabs">
			<style>{CSS}</style>
			<div className="wg-ult-row" role="tablist" onKeyDown={onKeys} ref={rowRef}>
				{rows.map((row) => (
					<button
						key={row.ref}
						type="button"
						role="tab"
						aria-selected={row.ref === active?.ref}
						aria-label={row.label || UNNAMED}
						tabIndex={row.ref === active?.ref ? 0 : -1}
						onClick={() => selection.update(row.ref)}
					>
						{row.label || UNNAMED}
					</button>
				))}
			</div>
		</div>
	);
});
