import { flatRows, createWidget, textOf, useData, WidgetRoot } from "widgetarium";
import type { CollectionGateway, GetAction, ListAction, UpdateAction, ValueGateway } from "widgetarium";
import { Button, ButtonLabel, Icon, Popover, PopoverItem, PopoverSearch, useRoomForLabel } from "widgetarium/kit";
import { useRef, useState } from "react";
import type { Ref } from "react";

const CSS = `
.orbi-filter { justify-content: flex-start; align-items: stretch; }

.orbi-filter .ofp-open { gap: var(--size-4-2, 8px); }
.orbi-filter .ofp-open.is-on { color: var(--interactive-accent); }
.orbi-filter .ofp-open.is-on::before { background: var(--wg-kit-accent-wash); }
.orbi-filter .ofp-open .ofp-icon { width: 17px; height: 17px; }
.orbi-filter .ofp-count { flex: none; }

.orbi-filter .ofp-icon { width: 16px; height: 16px; flex: none; }

.orbi-filter .ofp-pop {
	visibility: visible;
	width: 320px;
	max-width: min(320px, calc(100vw - 32px));
}

.orbi-filter .ofp-panel {
	display: flex;
	flex-direction: column;
	gap: var(--size-4-3, 12px);
	max-height: 70vh;
	overflow-y: auto;
}

.orbi-filter .ofp-group { display: flex; flex-direction: column; }

.orbi-filter .ofp-group-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--size-4-2, 8px);
	width: 100%;
	appearance: none;
	-webkit-appearance: none;
	margin: 0;
	padding: var(--size-2-2, 4px) var(--size-4-2, 8px);
	border: none;
	border-radius: 0;
	background: none;
	box-shadow: none;
	font-family: inherit;
	font-size: var(--font-ui-small, 14px);
	font-weight: var(--font-semibold, 600);
	color: var(--text-normal);
	text-align: left;
	cursor: pointer;
}

.orbi-filter .ofp-group-head::before { border-radius: var(--wg-kit-item); }
.orbi-filter .ofp-group-head:hover::before { background: var(--background-modifier-hover); }

.orbi-filter .ofp-chev {
	color: var(--text-faint);
	transition: transform var(--wg-quick) var(--wg-ease);
}

.orbi-filter .ofp-group-head.is-on .ofp-chev { transform: rotate(90deg); }

.orbi-filter .ofp-option { width: 100%; justify-content: flex-start; }

.orbi-filter .ofp-av {
	display: grid;
	place-content: center;
	flex: none;
	width: 28px;
	height: 28px;
	border-radius: var(--wg-kit-pill, 999px);
	font-size: var(--font-ui-smaller, 12px);
	font-weight: var(--font-semibold, 600);
}

.orbi-filter .ofp-av.is-accent { background: var(--wg-kit-accent-wash); color: var(--interactive-accent); }
.orbi-filter .ofp-av.is-ok { background: var(--wg-kit-success-wash); color: var(--text-success); }
.orbi-filter .ofp-av.is-warn { background: var(--wg-kit-warning-wash); color: var(--wg-kit-warning); }
.orbi-filter .ofp-av.is-err { background: var(--wg-kit-error-wash); color: var(--text-error); }

.orbi-filter .ofp-name {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.orbi-filter .ofp-empty {
	margin: 0;
	padding: var(--size-4-2, 8px) var(--size-4-3, 12px);
	font-size: var(--font-ui-smaller, 12px);
	color: var(--text-faint);
}

.orbi-filter .ofp-foot {
	display: flex;
	align-items: center;
	gap: var(--size-4-2, 8px);
	padding: var(--size-4-2, 8px) var(--size-2-2, 4px) var(--size-2-2, 4px);
}

.orbi-filter .ofp-reset { flex: 1; }
.orbi-filter .ofp-apply { flex: 2; }

.orbi.orbi-filter .ofp-open.is-tight { justify-content: center; padding: 0; }
`;

const CHECKBOX = "checkbox";
const RADIO = "radio";
const PEOPLE = "people";

const PROP = "prop";
const LABEL = "label";
const CONTROL = "control";
const RECORD_NAME = "name";

type Held = Record<string, unknown> & { props?: Record<string, unknown> };
type Group = { prop: string; control: string; label: string };
type TaskRow = { ref: string; props?: Record<string, unknown> };
type Chosen = Record<string, string | string[]>;

const PEOPLE_NAMES = ["assignees", "members", "people", "owner", "owners"];
const NEVER_FILTERED = ["title", "board", "status", "deadline", "due"];
// TRADE-OFF: a property nearly every note carries a DIFFERENT value for is an identifier, not a
// filter — ticking it would leave one row, which is a search, and the bar has a search already
const MOST_DISTINCT_SHARE = 0.75;

function controlFor(prop: string, named: string): string {
	if (named === RADIO || named === PEOPLE || named === CHECKBOX) return named;
	return PEOPLE_NAMES.includes(prop.toLowerCase()) ? PEOPLE : CHECKBOX;
}

function groupOf(held: Held): Group {
	const prop = textOf(held, PROP) || textOf(held, RECORD_NAME);
	return { prop, label: textOf(held, LABEL) || prop, control: controlFor(prop, textOf(held, CONTROL)) };
}

function isCounted(rows: TaskRow[], prop: string): boolean {
	const values = valuesFor(rows, prop);
	return values.length > 0 && values.every((value) => value !== "" && Number.isFinite(Number(value)));
}

function groupsFromData(rows: TaskRow[]): Group[] {
	const seen = new Map<string, string>();
	for (const row of rows) {
		for (const key of Object.keys(row.props ?? {})) seen.set(key.toLowerCase(), key);
	}
	return [...seen.values()]
		.filter((key) => !NEVER_FILTERED.includes(key.toLowerCase()))
		.filter((key) => !isCounted(rows, key))
		.filter((key) => {
			const values = valuesFor(rows, key);
			return values.length > 1 && values.length <= Math.max(2, rows.length * MOST_DISTINCT_SHARE);
		})
		.sort()
		.map((key) => ({
			prop: key,
			control: controlFor(key, ""),
			label: `${key.charAt(0).toUpperCase()}${key.slice(1)}`,
		}));
}

function groupsFromBoard(names: string[], rows: TaskRow[]): Group[] {
	return names
		.map((name) => {
			const prop = keyCarrying(rows, name) ?? String(name).toLowerCase();
			return { prop, control: controlFor(prop, ""), label: String(name) };
		})
		.filter((group) => valuesFor(rows, group.prop).length > 0)
		.filter((group) => !NEVER_FILTERED.includes(group.prop.toLowerCase()));
}

function keyCarrying(rows: TaskRow[], name: string): string | null {
	const wanted = String(name).toLowerCase();
	for (const row of rows) {
		const found = Object.keys(row.props ?? {}).find((key) => key.toLowerCase() === wanted);
		if (found) return found;
	}
	return null;
}

function valuesFor(rows: TaskRow[], prop: string): string[] {
	const seen = new Set<string>();
	for (const row of rows) {
		const held = row.props?.[prop];
		for (const value of Array.isArray(held) ? held : [held]) {
			if (value !== undefined && value !== null && value !== "") seen.add(String(value));
		}
	}
	return [...seen].sort();
}

function initialOf(value: string): string {
	return (
		String(value ?? "?")
			.trim()
			.charAt(0)
			.toUpperCase() || "?"
	);
}

const FIRST_TONE = "is-accent";

const TONES = [FIRST_TONE, "is-ok", "is-warn", "is-err"];

// TRADE-OFF: hashed, so there is no palette to maintain
function toneOf(value: string): string {
	let sum = 0;
	for (const letter of String(value)) sum += letter.charCodeAt(0);
	return TONES[sum % TONES.length] ?? FIRST_TONE;
}

function countOf(chosen: Chosen): number {
	return Object.values(chosen ?? {}).reduce(
		(total: number, values) => total + (Array.isArray(values) ? values.length : 1),
		0,
	);
}

function dropped(chosen: Chosen, prop: string): Chosen {
	const { [prop]: gone, ...rest } = chosen;
	return rest;
}

type Listed<T> = CollectionGateway<T, { list: ListAction }>;

type FilterProps = {
	tasks: Listed<Held>;
	groups: Listed<Held>;
	properties: Listed<Held>;
	openGroup: ValueGateway<string>;
	chosen: ValueGateway<Chosen, { get: GetAction; update: UpdateAction }>;
};

// TRADE-OFF: an authored list outranks a derived one — a board may want its own order and labels
function groupsShown(authored: Group[], fromBoard: Group[], rows: TaskRow[]): Group[] {
	if (authored.length > 0) return authored;
	if (fromBoard.length > 0) return fromBoard;
	return groupsFromData(rows);
}

// TRADE-OFF: a draft until Apply, so ticking four boxes queries the vault once
function useChosenDraft(applied: Chosen, chosen: FilterProps["chosen"]) {
	const [isOpen, setOpen] = useState(false);
	const [draft, setDraft] = useState<Chosen>(applied);

	const draftAfterRadio = (group: Group, value: string) => {
		if (draft[group.prop] === value) return dropped(draft, group.prop);
		return { ...draft, [group.prop]: value };
	};

	const draftAfterCheck = (group: Group, value: string) => {
		const held = (draft[group.prop] as string[]) ?? [];
		const next = held.includes(value) ? held.filter((item) => item !== value) : [...held, value];
		if (next.length === 0) return dropped(draft, group.prop);
		return { ...draft, [group.prop]: next };
	};

	return {
		isOpen,
		change: (next: boolean) => {
			if (next) setDraft(applied);
			setOpen(next);
		},
		isChosen: (group: Group, value: string) => {
			if (group.control === RADIO) return draft[group.prop] === value;
			return ((draft[group.prop] as string[]) ?? []).includes(value);
		},
		toggle: (group: Group, value: string) => {
			if (group.control === RADIO) return setDraft(draftAfterRadio(group, value));
			setDraft(draftAfterCheck(group, value));
		},
		apply: () => {
			chosen.update(draft);
			setOpen(false);
		},
		reset: () => {
			setDraft({});
			chosen.update({});
		},
	};
}

type GroupValuesProps = {
	group: Group;
	values: string[];
	isChosen: (group: Group, value: string) => boolean;
	onToggle: (group: Group, value: string) => void;
};

function GroupValues({ group, values, isChosen, onToggle }: GroupValuesProps) {
	if (values.length === 0) return <p className="ofp-empty">Nothing to choose from yet.</p>;
	return values.map((value) => (
		<PopoverItem
			key={value}
			className="ofp-option"
			checked={isChosen(group, value)}
			onClick={() => onToggle(group, value)}
		>
			{group.control === PEOPLE ? <span className={`ofp-av ${toneOf(value)}`}>{initialOf(value)}</span> : null}
			<span className="ofp-name">{value}</span>
		</PopoverItem>
	));
}

type FilterGroupProps = GroupValuesProps & { isUnfolded: boolean; onUnfold: (prop: string) => void };

function FilterGroup({ group, values, isUnfolded, onUnfold, isChosen, onToggle }: FilterGroupProps) {
	return (
		<div className="ofp-group">
			<button
				type="button"
				className={`ofp-group-head${isUnfolded ? " is-on" : ""}`}
				onClick={() => onUnfold(isUnfolded ? "" : group.prop)}
			>
				<span>{group.label}</span>
				<Icon name="chevron" className="ofp-chev" />
			</button>
			{isUnfolded ? <GroupValues group={group} values={values} isChosen={isChosen} onToggle={onToggle} /> : null}
		</div>
	);
}

type GroupListProps = {
	groups: Group[];
	rows: TaskRow[];
	needle: string;
	unfolded: string;
	onUnfold: (prop: string) => void;
	picking: ReturnType<typeof useChosenDraft>;
};

function GroupList({ groups, rows, needle, unfolded, onUnfold, picking }: GroupListProps) {
	const matching = (value: string) => needle === "" || value.toLowerCase().includes(needle);
	return groups.map((group: Group) => (
		<FilterGroup
			key={group.prop}
			group={group}
			values={valuesFor(rows, group.prop).filter(matching)}
			isUnfolded={unfolded === group.prop}
			onUnfold={onUnfold}
			isChosen={picking.isChosen}
			onToggle={picking.toggle}
		/>
	));
}

type FilterTriggerProps = { triggerRef: Ref<HTMLButtonElement>; count: number; hasRoomForWord: boolean };

function FilterTrigger({ triggerRef, count, hasRoomForWord }: FilterTriggerProps) {
	return (
		<button
			type="button"
			ref={triggerRef}
			className={`wg-kit-btn is-m is-block ofp-open${count > 0 ? " is-on" : ""}${hasRoomForWord ? "" : " is-tight"}`}
		>
			<Icon name="filter" className="ofp-icon" />
			{hasRoomForWord ? <ButtonLabel>Filter</ButtonLabel> : null}
			{count > 0 ? <span className="wg-kit-count ofp-count">{count}</span> : null}
		</button>
	);
}

export default createWidget(
	function OrbiTaskFilter({ tasks, groups, openGroup, properties, chosen }: FilterProps) {
		const listed = useData(tasks.list);
		const rows: TaskRow[] = flatRows(listed.rows);
		const authored = useData(groups.list)
			.rows.map(({ value }: { value: Held }) => groupOf(value))
			.filter((group: Group) => group.prop !== "");
		const named = useData(properties.list)
			.rows.map(({ value }: { value: Held }) => textOf(value, "name") || textOf(value, RECORD_NAME))
			.filter(Boolean);
		const shownGroups = groupsShown(authored, groupsFromBoard(named, rows), rows);
		const applied: Chosen = (useData(chosen.get).data as Chosen) ?? {};

		const triggerRef = useRef<HTMLButtonElement | null>(null);
		const hasRoomForWord = useRoomForLabel(triggerRef);

		const picking = useChosenDraft(applied, chosen);
		const unfolded = String(useData(openGroup.get).data ?? "");
		const [pressed, setPressed] = useState<string | null>(null);
		const shown = pressed ?? unfolded;

		return (
			<WidgetRoot className="orbi orbi-filter" defaultRounded="none" defaultBackgroundType="none">
				<style>{CSS}</style>

				<Popover
					className="ofp-pop"
					trigger={<FilterTrigger triggerRef={triggerRef} count={countOf(applied)} hasRoomForWord={hasRoomForWord} />}
					isOpen={picking.isOpen}
					onOpenChange={picking.change}
				>
					<div className="ofp-panel">
						<PopoverSearch placeholder="Keyword" hint="Narrows the choices below, not the board">
							{(needle: string) => (
								<GroupList
									groups={shownGroups}
									rows={rows}
									needle={needle}
									unfolded={shown}
									onUnfold={setPressed}
									picking={picking}
								/>
							)}
						</PopoverSearch>

						<div className="ofp-foot">
							<Button className="ofp-reset" onClick={picking.reset}>
								Reset
							</Button>
							<Button className="ofp-apply" variant="accent" onClick={picking.apply}>
								Apply
							</Button>
						</div>
					</div>
				</Popover>
			</WidgetRoot>
		);
	},
	{
		props: {
			tasks: {
				label: "Tasks",
				default: {
					path: "Orbitask/Tasks",
					where: [{ prop: "board", op: "is", value: { wants: "@core/editable-tabs/selection" } }],
				},
			},
			groups: {
				label: "Filter by",
				hint: "The properties offered. Empty offers what the board names or the tasks carry.",
				item: {
					fields: [
						{ key: "prop", label: "Property", type: "text", required: true },
						{ key: "label", label: "Label", type: "text" },
						{ key: "control", label: "Control", type: "text" },
					],
				},
				default: { value: [] },
			},
			openGroup: {
				type: "text",
				label: "Open by default",
				hint: "Whose choices unfold on opening. Name none and it opens folded.",
				default: { value: "" },
			},
			properties: {
				label: "Board properties",
				hint: "The properties this board names. Empty offers what the tasks carry.",
				item: { fields: [{ key: "name", label: "Property", type: "text", required: true }] },
				default: { value: [] },
			},
			chosen: {
				shape: "conditions",
				label: "Chosen filters",
				hint: "What is ticked, as a box. Point a widget's Where at it and this narrows it.",
				default: { from: "memory" },
			},
		},
	},
);
