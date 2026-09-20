import { createWidget, defineManifest, defineProp, fieldOf, textOf, useData } from "widgetarium";
import { Button, ButtonLabel, Icon, Popover, PopoverItem, Segmented } from "widgetarium/kit";
import { useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

const ALL_OPTIONS = 200;
const UNNAMED = "Untitled";
const LABEL = "label";
const VALUE = "value";
const RECORD_NAME = "name";
const HIDDEN = "hidden";
const MENU_BELOW_PX = 220;

const STEP_BY_KEY: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };
const END_BY_KEY: Record<string, number> = { Home: 0, End: -1 };

const CSS = `
.wg-segmented-switch { display: flex; align-items: center; min-width: 0; }

.wg-segmented-switch .wg-kit-seg { overflow-x: hidden; }

.wg-segmented-switch .wg-kit-seg button {
	min-height: 42px;
	max-width: 12rem;
	overflow: hidden;
	text-overflow: ellipsis;
}

.wg-segmented-switch .wg-sgs-pick { min-height: 42px; min-width: 0; }

.wg-segmented-switch .wg-sgs-pick .wg-kit-btn-label {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.wg-segmented-switch .wg-sgs-caret { transform: rotate(90deg); transition: transform var(--wg-press) var(--wg-ease); }
.wg-segmented-switch .wg-sgs-pick.is-open .wg-sgs-caret { transform: rotate(-90deg); }
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

// TRADE-OFF: state, not a ref: the first render has no rows and no element, and a ref leaves the effect on null forever
// TRADE-OFF: the needed width is remembered, because a collapsed switch holds no track to measure
function useTrackFits() {
	const [host, holdHost] = useState<HTMLDivElement | null>(null);
	const [isFitting, setFitting] = useState(true);
	const needed = useRef(MENU_BELOW_PX);

	useLayoutEffect(() => {
		if (!host) return;

		const measure = () => {
			const room = host.clientWidth;
			if (room === 0) return;
			const track = host.querySelector(".wg-kit-seg");
			if (track) needed.current = Math.max(track.scrollWidth, MENU_BELOW_PX);
			setFitting(room >= needed.current);
		};

		measure();
		if (typeof ResizeObserver !== "function") return;
		const watcher = new ResizeObserver(measure);
		watcher.observe(host);
		return () => watcher.disconnect();
	}, [host]);

	return { isFitting, holdHost };
}

export const manifest = defineManifest({
	title: "Segmented switch",
	description: "A filled track whose raised chip says which of two views of the same content is shown.",
	keywords: ["segmented", "switch", "control", "toggle", "chip", "track", "mode", "views", "pill", "choice", "between"],
	role: "control",
	size: { collapseBelowPx: MENU_BELOW_PX, tallestPx: 48 },
	preview: {
		size: { w: 2, h: 1 },
		props: { options: { rows: [{ label: "Git tree" }, { label: "Report" }] } },
	},
	props: {
		options: defineProp<Held[]>()({
			label: "Options",
			hint: "Every choice is a record. Bind a view box and it offers the views it holds.",
			wants: "@default/view-group/holds",
			default: [{ label: "Git tree" }, { label: "Report" }],
			describes: {
				label: { label: "Label", type: "text", required: true },
				value: { label: "Value", type: "text" },
				hidden: { label: "Hidden", type: "boolean" },
			},
		}),
		selection: defineProp<string>()({
			label: "Shown choice",
			hint: "Which choice is shown. Bind the view box's own selection and the two move together.",
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
	const { isFitting, holdHost } = useTrackFits();
	const [isOpen, setOpen] = useState(false);

	const rows: Option[] = listed.data.filter((held) => !fieldOf(held, HIDDEN)).map((held) => optionOf(held.ref, held));
	const active = rows.find((row) => row.value === chosen) ?? rows[0] ?? null;

	if (rows.length === 0) return null;

	const choose = (ref: string) => selection.update(ref);

	const onKeys = (event: ReactKeyboardEvent<HTMLDivElement>) => {
		const from = rows.findIndex((row) => row.ref === active?.ref);
		const at = steppedTo(event.key, Math.max(from, 0), rows.length);
		const picked = at === null ? null : rows[at];
		if (at === null || !picked) return;
		event.preventDefault();
		choose(picked.ref);
		event.currentTarget.querySelectorAll<HTMLElement>(".wg-kit-seg button")[at]?.focus();
	};

	const trigger = (
		<Button block className={`wg-sgs-pick${isOpen ? " is-open" : ""}`} aria-label="Change what is shown">
			<ButtonLabel>{active?.label || UNNAMED}</ButtonLabel>
			<Icon name="chevron" size={15} className="wg-sgs-caret" />
		</Button>
	);

	return (
		<div className="wg-segmented-switch" ref={holdHost} onKeyDown={isFitting ? onKeys : undefined}>
			<style>{CSS}</style>
			{isFitting ? (
				<Segmented
					items={rows.map((row) => ({ value: row.ref, label: row.label || UNNAMED }))}
					value={active?.ref ?? ""}
					onChange={choose}
				/>
			) : (
				<Popover trigger={trigger} isOpen={isOpen} onOpenChange={setOpen}>
					{rows.map((row) => (
						<PopoverItem
							key={row.ref}
							checked={row.ref === active?.ref}
							onClick={() => {
								setOpen(false);
								choose(row.ref);
							}}
						>
							{row.label || UNNAMED}
						</PopoverItem>
					))}
				</Popover>
			)}
		</div>
	);
});
