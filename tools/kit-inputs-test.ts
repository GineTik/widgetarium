import { JSDOM } from "jsdom";
import type { ReactElement, ReactNode } from "react";
import { z } from "zod";
import type { FieldRootProps } from "../packages/kit/src/components/field.tsx";
import type { FormSchema, Matchers, UseFormReturn } from "../packages/kit/src/index.ts";
import { byId, found } from "./dom-find.ts";

const dom = new JSDOM('<!doctype html><body><div id="host"></div></body>', { pretendToBeVisual: true });
Object.assign(globalThis, {
	window: dom.window,
	document: dom.window.document,
	Node: dom.window.Node,
	Element: dom.window.Element,
	HTMLElement: dom.window.HTMLElement,
	HTMLInputElement: dom.window.HTMLInputElement,
	HTMLTextAreaElement: dom.window.HTMLTextAreaElement,
	HTMLSelectElement: dom.window.HTMLSelectElement,
	SVGElement: dom.window.SVGElement,
	getComputedStyle: dom.window.getComputedStyle,
	requestAnimationFrame: dom.window.requestAnimationFrame,
	cancelAnimationFrame: dom.window.cancelAnimationFrame,
	MouseEvent: dom.window.MouseEvent,
	KeyboardEvent: dom.window.KeyboardEvent,
	Event: dom.window.Event,
	ResizeObserver: class {
		observe(): void {}
		disconnect(): void {}
	},
});

const { createElement: h } = await import("react");
const { render } = await import("../packages/core/src/engine/render.js");
const kit = await import("../packages/kit/src/index.ts");
const FieldRoot: (props: FieldRootProps) => ReactElement = kit.Field;

const settle = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

let failed = 0;
let checks = 0;
function check(name: string, got: unknown, want: unknown): void {
	checks += 1;
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
}

const host = byId(document, "host");
const draw = async (tree: ReactNode): Promise<void> => {
	render(tree, host);
	await settle();
};
const all = (selector: string, root: ParentNode = host): HTMLElement[] => [
	...root.querySelectorAll<HTMLElement>(selector),
];
const day = (key: string): HTMLElement => found(host, `[data-date="${key}"]:not([data-outside])`) as HTMLElement;
const press = (node: Element, key: string, init: KeyboardEventInit = {}): boolean =>
	node.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init }));
const keyOf = (date: Date | undefined): string | undefined =>
	date ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` : undefined;
function typeInto(field: HTMLInputElement | HTMLTextAreaElement, text: string): void {
	const prototype = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
	Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(field, text);
	field.dispatchEvent(new Event("input", { bubbles: true }));
}
function inputIn(selector: string): HTMLInputElement {
	const element = found(host, selector);
	if (!(element instanceof HTMLInputElement)) throw new Error(`${selector} is not an input`);
	return element;
}

const SEPTEMBER = new Date(2026, 8, 1);
const TODAY = new Date(2026, 8, 3);

{
	const ranges: unknown[] = [];
	await draw(
		h(kit.Calendar, {
			mode: "range",
			defaultMonth: SEPTEMBER,
			today: TODAY,
			onSelect: (range) => ranges.push([keyOf(range?.from), keyOf(range?.to)]),
		}),
	);
	day("2026-8-10").click();
	await settle();
	day("2026-8-14").click();
	await settle();
	check("CALENDAR RANGE: two presses report from, then from and to", ranges, [
		["2026-8-10", undefined],
		["2026-8-10", "2026-8-14"],
	]);
	check(
		"the range marks its start, its middle and its end",
		[all("[data-range-start]").length, all("[data-range-middle]").length, all("[data-range-end]").length],
		[1, 3, 1],
	);
	day("2026-8-5").click();
	await settle();
	check("a press on a complete range starts a new one", ranges.at(-1), ["2026-8-5", undefined]);
}

{
	const picks: unknown[] = [];
	await draw(
		h(kit.Calendar, {
			mode: "multiple",
			defaultMonth: SEPTEMBER,
			today: TODAY,
			onSelect: (dates) => picks.push(dates?.map(keyOf)),
		}),
	);
	day("2026-8-2").click();
	await settle();
	day("2026-8-9").click();
	await settle();
	day("2026-8-2").click();
	await settle();
	check("CALENDAR MULTIPLE: a press adds a day, a second press takes it out", picks, [
		["2026-8-2"],
		["2026-8-2", "2026-8-9"],
		["2026-8-9"],
	]);
}

{
	const single: unknown[] = [];
	const legacy: unknown[] = [];
	await draw(
		h("div", null, [
			h(
				"div",
				{ key: "s", id: "single" },
				h(kit.Calendar, {
					mode: "single",
					defaultMonth: SEPTEMBER,
					today: TODAY,
					onSelect: (date) => single.push(keyOf(date) ?? null),
				}),
			),
			h(
				"div",
				{ key: "l", id: "legacy" },
				h(kit.Calendar, {
					defaultMonth: SEPTEMBER,
					today: TODAY,
					onSelect: (date: Date) => legacy.push(keyOf(date)),
				}),
			),
		]),
	);
	const pressTwice = async (id: string): Promise<void> => {
		for (let press = 0; press < 2; press += 1) {
			found(byId(document, id), '[data-date="2026-8-7"]:not([data-outside])').dispatchEvent(
				new MouseEvent("click", { bubbles: true }),
			);
			await settle();
		}
	};
	await pressTwice("single");
	await pressTwice("legacy");
	check('CALENDAR SINGLE: mode="single" lets the picked day go again', single, ["2026-8-7", null]);
	check(
		"and the old shape with no mode keeps answering a date and keeps it marked",
		[legacy, found(byId(document, "legacy"), "[aria-selected='true']").textContent],
		[["2026-8-7", "2026-8-7"], "7"],
	);
}

{
	const picked: unknown[] = [];
	await draw(
		h(kit.Calendar, {
			mode: "single",
			defaultMonth: SEPTEMBER,
			today: TODAY,
			disabled: [{ dayOfWeek: [0] }, { before: new Date(2026, 8, 3) }],
			onSelect: (date) => picked.push(keyOf(date)),
		}),
	);
	day("2026-8-6").click();
	day("2026-8-2").click();
	await settle();
	check(
		"CALENDAR DISABLED: a Sunday and a day before the 3rd cannot be picked",
		[day("2026-8-6").hasAttribute("disabled"), day("2026-8-2").hasAttribute("disabled"), picked],
		[true, true, []],
	);
	day("2026-8-5").focus();
	press(day("2026-8-5"), "ArrowRight");
	await settle();
	check(
		"and the arrow keys step over a disabled day",
		(document.activeElement as HTMLElement | null)?.dataset["date"],
		"2026-8-7",
	);
}

{
	await draw(
		h(kit.Calendar, {
			defaultMonth: SEPTEMBER,
			today: TODAY,
			weekStartsOn: 0,
			fixedWeeks: false,
			showOutsideDays: false,
		}),
	);
	check(
		"CALENDAR GRID: weekStartsOn=0 starts on Sunday, fixedWeeks=false drops the empty sixth week",
		[
			found(host, ".wg-kit-cal-weekday").textContent,
			all(".wg-kit-cal-day").length,
			all(".wg-kit-cal-day").findIndex((cell) => cell.dataset["date"] === "2026-8-1"),
		],
		["S", 35, 2],
	);
	check("showOutsideDays=false draws the neighbours' days as empty cells", all(".wg-kit-cal-day.is-hidden").length, 5);
}

{
	await draw(h(kit.Calendar, { defaultMonth: SEPTEMBER, today: TODAY, numberOfMonths: 2 }));
	check(
		"CALENDAR numberOfMonths=2 draws two months side by side",
		all(".wg-kit-cal-month").map((label) => label.textContent),
		["September 2026", "October 2026"],
	);
}

{
	const shown: unknown[] = [];
	await draw(
		h(kit.Popover, { defaultOpen: true, placement: "below" }, [
			h(kit.PopoverTrigger, { key: "t" }, "Due"),
			h(
				kit.PopoverContent,
				{ key: "c" },
				h(kit.Calendar, {
					captionLayout: "dropdown",
					defaultMonth: SEPTEMBER,
					today: TODAY,
					startMonth: new Date(2020, 0, 1),
					endMonth: new Date(2030, 11, 1),
					onMonthChange: (month: Date) => shown.push(keyOf(month)),
				}),
			),
		]),
	);
	const monthTrigger = found(host, "[aria-label='Month']");
	const yearTrigger = found(host, "[aria-label='Year']");
	check(
		"CALENDAR DROPDOWN: the month and the year are two kit Selects",
		[monthTrigger.getAttribute("data-slot"), monthTrigger.textContent, yearTrigger.textContent],
		["select-trigger", "Sep", "2026"],
	);
	(yearTrigger as HTMLElement).click();
	await settle();
	const years = all("[data-slot='select-item']", document.body);
	check(
		"the year list runs from startMonth to endMonth",
		[years[0]?.textContent, years.at(-1)?.textContent],
		["2020", "2030"],
	);
	const year2028 = years.find((option) => option.textContent === "2028");
	year2028?.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
	year2028?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
	year2028?.click();
	await settle();
	check(
		"picking a year turns the page and the date picker around it stays open",
		[
			shown,
			found(host, "[aria-label='Year']").textContent,
			found(host, "[data-slot='popover-trigger']").getAttribute("data-state"),
		],
		[["2028-8-1"], "2028", "open"],
	);
	await draw(null);
	await draw(h(kit.Calendar, { defaultMonth: new Date(2020, 0, 1), startMonth: new Date(2020, 0, 1), today: TODAY }));
	check(
		"startMonth stops the previous-month button",
		found(host, "[aria-label='Previous month']").hasAttribute("disabled"),
		true,
	);
}

{
	const typed: string[] = [];
	const completed: string[] = [];
	const slots = Array.from({ length: 4 }, (_, index) => h(kit.InputOTPSlot, { key: index, index }));
	await draw(
		h(
			kit.InputOTP,
			{
				maxLength: 4,
				pattern: kit.REGEXP_ONLY_DIGITS,
				onChange: (value: string) => typed.push(value),
				onComplete: (value: string) => completed.push(value),
			},
			h(kit.InputOTPGroup, null, slots),
		),
	);
	const otp = inputIn("[data-slot='input-otp'] input");
	typeInto(otp, "12a");
	await settle();
	typeInto(otp, "12");
	await settle();
	typeInto(otp, "123456");
	await settle();
	check("INPUT OTP: a pattern refuses letters and maxLength cuts the rest", typed, ["12", "1234"]);
	check(
		"each slot shows its character and the full code completes once",
		[all("[data-slot='input-otp-slot']").map((slot) => slot.textContent), completed],
		[["1", "2", "3", "4"], ["1234"]],
	);
}

{
	const chosen: string[] = [];
	await draw(
		h(kit.RadioGroup, { defaultValue: "a", onValueChange: (value: string) => chosen.push(value) }, [
			h(kit.RadioGroupItem, { key: "a", value: "a" }),
			h(kit.RadioGroupItem, { key: "b", value: "b", disabled: true }),
			h(kit.RadioGroupItem, { key: "c", value: "c" }),
		]),
	);
	const [first] = all("[role='radio']");
	first?.focus();
	if (first) press(first, "ArrowDown");
	await settle();
	check(
		"RADIO GROUP: an arrow key moves past a disabled item and checks the next",
		[chosen, all("[role='radio']").map((radio) => radio.getAttribute("aria-checked")), all("[tabindex='0']").length],
		[["c"], ["false", "false", "true"], 1],
	);
	await draw(null);
	await draw(
		h(kit.RadioGroup, { value: "none" }, [
			h(kit.RadioGroupItem, { key: "a", value: "a", disabled: true }),
			h(kit.RadioGroupItem, { key: "b", value: "b" }),
			h(kit.RadioGroupItem, { key: "c", value: "c" }),
		]),
	);
	check(
		"with nothing checked, the first enabled radio is the one tab stop",
		all("[role='radio']").map((radio) => radio.tabIndex),
		[-1, 0, -1],
	);
}

{
	const values: number[][] = [];
	const committed: number[][] = [];
	await draw(
		h(kit.Slider, {
			defaultValue: [20, 30],
			step: 5,
			onValueChange: (value: number[]) => values.push(value),
			onValueCommit: (value: number[]) => committed.push(value),
		}),
	);
	const [low, high] = all("[role='slider']");
	if (low) press(low, "ArrowRight");
	await settle();
	if (low) press(low, "ArrowRight");
	if (low) press(low, "ArrowRight");
	await settle();
	if (high) press(high, "End");
	await settle();
	check("SLIDER: a key steps by step, a thumb stops at its neighbour, End goes to max", values, [
		[25, 30],
		[30, 30],
		[30, 100],
	]);
	check("every key press that moves a thumb commits, one that cannot move it does not", committed.length, 3);
	check(
		"each thumb is a slider with its own value",
		all("[role='slider']").map((thumb) => thumb.getAttribute("aria-valuenow")),
		["30", "100"],
	);
	const track = found(host, "[data-slot='slider-track']");
	track.getBoundingClientRect = () => ({
		left: 0,
		top: 0,
		width: 200,
		height: 10,
		right: 200,
		bottom: 10,
		x: 0,
		y: 0,
		toJSON: () => ({}),
	});
	found(host, "[data-slot='slider']").dispatchEvent(
		new MouseEvent("pointerdown", { bubbles: true, clientX: 190, clientY: 5 }),
	);
	await settle();
	check("a press on the track moves the nearest thumb", values.at(-1), [30, 95]);
	const inverted: number[][] = [];
	await draw(null);
	await draw(
		h(kit.Slider, { defaultValue: [50], inverted: true, onValueChange: (value: number[]) => inverted.push(value) }),
	);
	press(found(host, "[role='slider']"), "ArrowRight");
	await settle();
	check("an inverted slider reads ArrowRight as a step down, as Radix does", inverted, [[49]]);
}

{
	const pressed: boolean[] = [];
	const picked: string[] = [];
	await draw(
		h("div", null, [
			h(kit.Toggle, { key: "t", "aria-label": "Bold", onPressedChange: (on: boolean) => pressed.push(on) }),
			h(kit.NativeSelect, { key: "n", defaultValue: "a", onValueChange: (value: string) => picked.push(value) }, [
				h(kit.NativeSelectOption, { key: "a", value: "a" }, "A"),
				h(kit.NativeSelectOption, { key: "b", value: "b" }, "B"),
			]),
			h(kit.InputGroup, { key: "g" }, [
				h(kit.InputGroupInput, { key: "i", id: "grouped" }),
				h(kit.InputGroupAddon, { key: "a", align: "inline-end" }, "kg"),
			]),
			h(kit.ButtonGroup, { key: "b", orientation: "vertical" }, h(kit.ButtonGroupSeparator, null)),
			h(kit.KbdGroup, { key: "k" }, h(kit.Kbd, null, "K")),
		]),
	);
	found(host, "[data-slot='toggle']").dispatchEvent(new MouseEvent("click", { bubbles: true }));
	await settle();
	const select = found(host, "select");
	if (select instanceof HTMLSelectElement) select.value = "b";
	select.dispatchEvent(new Event("change", { bubbles: true }));
	found(host, "[data-slot='input-group-addon']").dispatchEvent(new MouseEvent("click", { bubbles: true }));
	await settle();
	check(
		"TOGGLE · NATIVE SELECT · INPUT GROUP: pressed, picked, and a press on the addon focuses the input",
		[pressed, found(host, "[data-slot='toggle']").getAttribute("aria-pressed"), picked, document.activeElement?.id],
		[[true], "true", ["b"], "grouped"],
	);
	check(
		"BUTTON GROUP and KBD carry shadcn's slots",
		[
			found(host, "[data-slot='button-group']").getAttribute("data-orientation"),
			found(host, "[data-slot='button-group-separator']").getAttribute("data-orientation"),
			found(host, "[data-slot='kbd']").tagName,
		],
		["vertical", "vertical", "KBD"],
	);
}

{
	const values: unknown[] = [];
	const FRAMEWORKS = ["Next.js", "SvelteKit", "Nuxt.js", "Remix"];
	await draw(
		h(kit.Combobox<string>, { items: FRAMEWORKS, onValueChange: (value: string | null) => values.push(value) }, [
			h(kit.ComboboxInput, { key: "i", placeholder: "Framework" }),
			h(kit.ComboboxContent, { key: "c" }, [
				h(kit.ComboboxEmpty, { key: "e" }, "No items found."),
				h(kit.ComboboxList<string>, {
					key: "l",
					children: (item: string) => h(kit.ComboboxItem, { key: item, value: item }, item),
				}),
			]),
		]),
	);
	const input = inputIn("[role='combobox']");
	typeInto(input, "nu");
	await settle();
	check(
		"COMBOBOX: typing filters the items and opens the list",
		[all("[data-slot='combobox-item']").map((item) => item.textContent), input.getAttribute("aria-expanded")],
		[["Nuxt.js"], "true"],
	);
	typeInto(input, "zz");
	await settle();
	check(
		"nothing matching shows ComboboxEmpty",
		found(host, "[data-slot='combobox-empty']").textContent,
		"No items found.",
	);
	typeInto(input, "");
	await settle();
	press(input, "ArrowDown");
	await settle();
	press(input, "ArrowDown");
	await settle();
	check(
		"the highlighted option is announced through aria-activedescendant",
		document.getElementById(input.getAttribute("aria-activedescendant") ?? "")?.textContent,
		"SvelteKit",
	);
	press(input, "Enter");
	await settle();
	check(
		"arrows highlight, Enter picks, the list closes and the input shows the pick",
		[values, input.value, input.getAttribute("aria-expanded")],
		[["SvelteKit"], "SvelteKit", "false"],
	);
}

{
	const values: unknown[] = [];
	await draw(null);
	await draw(
		h(
			kit.Combobox<string>,
			{
				items: ["Astro", "Remix"],
				multiple: true,
				defaultValue: ["Astro"],
				onValueChange: (value: string[]) => values.push(value),
			},
			[
				h(kit.ComboboxChips, { key: "c" }, [
					h(kit.ComboboxValue<string>, {
						key: "v",
						children: (picked: string[]) => picked.map((value) => h(kit.ComboboxChip, { key: value }, value)),
					}),
					h(kit.ComboboxChipsInput, { key: "i" }),
				]),
				h(
					kit.ComboboxContent,
					{ key: "p" },
					h(kit.ComboboxList<string>, {
						children: (item: string) => h(kit.ComboboxItem, { key: item, value: item }, item),
					}),
				),
			],
		),
	);
	found(host, "[data-slot='combobox-chip-input']").dispatchEvent(new MouseEvent("click", { bubbles: true }));
	await settle();
	all("[data-slot='combobox-item']")
		.find((item) => item.textContent === "Remix")
		?.click();
	await settle();
	found(host, "[aria-label='Remove Astro']").dispatchEvent(new MouseEvent("click", { bubbles: true }));
	await settle();
	check(
		"COMBOBOX MULTIPLE: a pick adds a chip and the chip's remove takes it out",
		[values, all("[data-slot='combobox-chip']").map((chip) => chip.textContent)],
		[[["Astro", "Remix"], ["Remix"]], ["Remix"]],
	);
}

interface BugReport {
	readonly title: string;
	readonly description: string;
}

const BUG_SCHEMA = {
	safeParse(input: unknown) {
		const record = typeof input === "object" && input !== null ? input : {};
		const title = String(Reflect.get(record, "title") ?? "");
		const description = String(Reflect.get(record, "description") ?? "");
		const issues = [
			...(title.length < 5 ? [{ path: ["title"], message: "Bug title must be at least 5 characters." }] : []),
			...(description.length < 20
				? [{ path: ["description"], message: "Description must be at least 20 characters." }]
				: []),
		];
		if (issues.length > 0) return { success: false as const, error: { issues } };
		const data: BugReport = { title, description };
		return { success: true as const, data };
	},
};

{
	const sent: BugReport[] = [];
	function BugForm(): ReactNode {
		const form = kit.useForm({ schema: BUG_SCHEMA, defaultValues: { title: "", description: "" } });
		return h("form", { onSubmit: form.handleSubmit((data) => sent.push(data)) }, [
			kit.Controller({
				name: "title",
				control: form.control,
				render: ({ field, fieldState }) =>
					h(FieldRoot, {
						key: "t",
						...{ "data-invalid": String(fieldState.invalid) },
						children: [
							h(kit.FieldLabel, { key: "l", htmlFor: "bug-title" }, "Bug Title"),
							h(kit.Input, { key: "i", ...field, id: "bug-title", "aria-invalid": fieldState.invalid }),
							fieldState.invalid ? h(kit.FieldError, { key: "e", errors: [fieldState.error] }) : null,
						],
					}),
			}),
			kit.Controller({
				name: "description",
				control: form.control,
				render: ({ field }) => h(kit.InputGroupTextarea, { key: "d", ...field, id: "bug-description" }),
			}),
			h("button", { key: "s", type: "submit", id: "send" }, "Submit"),
			h("button", { key: "r", type: "button", id: "reset", onClick: () => form.reset() }, "Reset"),
		]);
	}
	await draw(h(BugForm, null));
	const errorsShown = (): string[] => all("[data-slot='field-error']").map((error) => error.textContent ?? "");
	typeInto(inputIn("#bug-title"), "Lo");
	await settle();
	check("FORMS: nothing is judged before the first submit", errorsShown(), []);
	found(host, "#send").dispatchEvent(new MouseEvent("click", { bubbles: true }));
	await settle();
	check(
		"a submit with a short title shows its message, marks the field and focuses it",
		[
			errorsShown(),
			found(host, "[data-slot='field']").getAttribute("data-invalid"),
			inputIn("#bug-title").getAttribute("aria-invalid"),
			document.activeElement?.id,
			sent,
		],
		[["Bug title must be at least 5 characters."], "true", "true", "bug-title", []],
	);
	typeInto(inputIn("#bug-title"), "Login fails");
	await settle();
	const fixed = errorsShown();
	typeInto(inputIn("#bug-title"), "Lo");
	await settle();
	check(
		"after a submit every change is judged again",
		[fixed, errorsShown()],
		[[], ["Bug title must be at least 5 characters."]],
	);
	typeInto(inputIn("#bug-title"), "Login fails");
	await settle();
	const area = found(host, "#bug-description");
	if (area instanceof HTMLTextAreaElement) typeInto(area, "The login button does nothing on mobile.");
	await settle();
	found(host, "#send").dispatchEvent(new MouseEvent("click", { bubbles: true }));
	await settle();
	check("a valid form hands the schema's data to the handler", sent, [
		{ title: "Login fails", description: "The login button does nothing on mobile." },
	]);
	found(host, "#reset").dispatchEvent(new MouseEvent("click", { bubbles: true }));
	await settle();
	check("reset brings back the defaults", inputIn("#bug-title").value, "");
}

{
	await draw(
		h(kit.FormFields, {
			fields: [{ name: "word", label: "Word" }],
			draft: { word: "" },
			errors: { word: { message: "Say a word." } },
			onChange: () => undefined,
		}),
	);
	const label = found(host, "[data-slot='field-label']");
	check(
		"FORM FIELDS: drawn through the Field anatomy, the label names its input and the error stands under it",
		[
			document.getElementById(label.getAttribute("for") ?? "")?.tagName,
			found(host, "[data-slot='field']").getAttribute("data-invalid"),
			found(host, "[data-slot='field-error']").textContent,
		],
		["INPUT", "true", "Say a word."],
	);
}

type Tally = {
	readonly count: number;
	readonly agree: boolean;
	readonly tags: readonly string[];
	readonly files: readonly unknown[];
	readonly title: string;
};

const TALLY: Tally = { count: 0, agree: false, tags: [], files: [], title: "" };

{
	const holder: { form: UseFormReturn<Tally, Tally> | null } = { form: null };
	const counts: number[] = [];
	function TallyForm(): ReactNode {
		const form = kit.useForm({ defaultValues: TALLY });
		holder.form = form;
		return h("form", { onSubmit: form.handleSubmit((data) => counts.push(data.count)) }, [
			h("input", { key: "c", id: "tally-count", type: "number", ...form.register("count") }),
			h("button", { key: "s", type: "submit", id: "tally-send" }, "Send"),
		]);
	}
	const formNow = (): UseFormReturn<Tally, Tally> => {
		if (!holder.form) throw new Error("the tally form never drew");
		return holder.form;
	};
	await draw(h(TallyForm, null));
	typeInto(inputIn("#tally-count"), "12");
	await settle();
	formNow()
		.register("agree")
		.onChange({ target: { type: "checkbox", checked: true } });
	formNow()
		.register("tags")
		.onChange({ target: { multiple: true, selectedOptions: [{ value: "a" }, { value: "b" }] } });
	formNow()
		.register("files")
		.onChange({ target: { type: "file", files: [{ name: "log.txt" }] } });
	await settle();
	const written = formNow().getValues();
	check(
		"FORMS UNCHECKED: a number input writes a number, a checkbox a boolean, a multiple select its values, a file input its files",
		[typeof written.count, written.count, written.agree, written.tags, written.files.length],
		["number", 12, true, ["a", "b"], 1],
	);
	const warned: unknown[] = [];
	const warn = console.warn;
	console.warn = (line: unknown) => warned.push(line);
	formNow().register("agree").onChange("yes");
	formNow().register("title").onChange({ target: {} });
	await settle();
	console.warn = warn;
	check(
		"a change of another kind is refused and said, and an event with no value is never stored",
		[formNow().getValues().agree, formNow().getValues().title, warned.length],
		[true, "", 2],
	);
	found(host, "#tally-send").dispatchEvent(new MouseEvent("click", { bubbles: true }));
	await settle();
	check("with no schema the handler gets the values themselves", counts, [12]);
	const next: Tally = { ...TALLY, title: "kept" };
	formNow().reset(next);
	formNow().reset();
	await settle();
	check("reset(next) then reset() lands on next, the defaults it set", formNow().getValues().title, "kept");
}

{
	const parses = { count: 0 };
	const COUNTED_SCHEMA: FormSchema<{ readonly title: string }> = {
		safeParse(input: unknown) {
			parses.count += 1;
			const title = typeof input === "object" && input !== null ? String(Reflect.get(input, "title")) : "";
			return { success: true, data: { title } };
		},
	};
	const seen: number[] = [];
	function CountedForm(): ReactNode {
		const form = kit.useForm({ schema: COUNTED_SCHEMA, defaultValues: { title: "" } });
		return h("form", { onSubmit: form.handleSubmit(() => undefined) }, [
			h("input", { key: "t", id: "counted-title", ...form.register("title") }),
			h("button", { key: "s", type: "submit", id: "counted-send" }, "Send"),
		]);
	}
	await draw(h(CountedForm, null));
	typeInto(inputIn("#counted-title"), "a");
	await settle();
	typeInto(inputIn("#counted-title"), "ab");
	await settle();
	seen.push(parses.count);
	found(host, "#counted-send").dispatchEvent(new MouseEvent("click", { bubbles: true }));
	await settle();
	seen.push(parses.count);
	typeInto(inputIn("#counted-title"), "abc");
	await settle();
	seen.push(parses.count);
	check(
		"FORMS PARSE: onSubmit parses nothing before the submit, the submit and its redraw parse once, a change once more",
		seen,
		[0, 1, 2],
	);
}

{
	const NESTED_SCHEMA: FormSchema<{ readonly city: string }> = {
		safeParse: () => ({
			success: false,
			error: {
				issues: [
					{ path: ["address", "city"], message: "Name a city." },
					{ path: [], message: "The form is incomplete." },
				],
			},
		}),
	};
	const refused: string[][] = [];
	function NestedForm(): ReactNode {
		const form = kit.useForm({ schema: NESTED_SCHEMA, defaultValues: { address: { city: "" } } });
		return h(
			"form",
			{
				onSubmit: form.handleSubmit(
					() => undefined,
					(errors) => refused.push(Object.keys(errors)),
				),
			},
			h("button", { type: "submit", id: "nested-send" }, "Send"),
		);
	}
	await draw(h(NestedForm, null));
	found(host, "#nested-send").dispatchEvent(new MouseEvent("click", { bubbles: true }));
	await settle();
	check("FORMS ERRORS: a nested issue is named by its whole path, a pathless one by root", refused, [
		["address.city", "root"],
	]);
}

const TRIMMED_SCHEMA = z.object({ title: z.string().trim() });
const ZOD_FITS: FormSchema<z.infer<typeof TRIMMED_SCHEMA>> = TRIMMED_SCHEMA;

{
	const sent: string[] = [];
	function ZodForm(): ReactNode {
		const form = kit.useForm({ schema: ZOD_FITS, defaultValues: { title: "  Hi  " } });
		return h(
			"form",
			{ onSubmit: form.handleSubmit((data) => sent.push(data.title)) },
			h("button", { type: "submit", id: "zod-send" }, "Send"),
		);
	}
	await draw(h(ZodForm, null));
	found(host, "#zod-send").dispatchEvent(new MouseEvent("click", { bubbles: true }));
	await settle();
	check("FORMS ZOD: a real zod object is a FormSchema and the handler gets its output", sent, ["Hi"]);
}

interface City {
	readonly id: number;
	readonly label: string;
}

const isCity = (value: unknown): value is City =>
	typeof value === "object" && value !== null && typeof Reflect.get(value, "id") === "number";

const TWIN_CITIES: readonly City[] = [
	{ id: 1, label: "Paris" },
	{ id: 2, label: "Paris" },
];

const cityOptions = (): ReactElement =>
	h(
		kit.ComboboxContent,
		null,
		h(kit.ComboboxList<City>, {
			isItem: isCity,
			children: (city: City) => h(kit.ComboboxItem, { key: city.id, value: city }, city.label),
		}),
	);

{
	const picked: (City | null)[] = [];
	await draw(null);
	await draw(
		h(kit.Combobox<City>, { items: TWIN_CITIES, onValueChange: (city: City | null) => picked.push(city) }, [
			h(kit.ComboboxInput, { key: "i" }),
			h("div", { key: "c" }, cityOptions()),
		]),
	);
	inputIn("[role='combobox']").click();
	await settle();
	const ids = all("[data-slot='combobox-item']").map((option) => option.id);
	all("[data-slot='combobox-item']")[0]?.click();
	await settle();
	inputIn("[role='combobox']").click();
	await settle();
	check(
		"COMBOBOX IDENTITY: two objects with one label have two option ids, and a pick selects only the one pressed",
		[new Set(ids).size, picked.map((city) => city?.id), all("[aria-selected='true']").length],
		[2, [1], 1],
	);
}

{
	await draw(null);
	await draw(
		h(
			kit.Combobox<City>,
			{ items: TWIN_CITIES, value: { id: 2, label: "Paris" }, itemToStringValue: (city: City) => String(city.id) },
			[h(kit.ComboboxInput, { key: "i" }), h("div", { key: "c" }, cityOptions())],
		),
	);
	inputIn("[role='combobox']").click();
	await settle();
	check(
		"itemToStringValue is the identity: a controlled copy of the second city marks the second option",
		all("[data-slot='combobox-item']").map((option) => option.getAttribute("aria-selected")),
		["false", "true"],
	);
}

{
	const picked: (City | null)[] = [];
	await draw(null);
	await draw(
		h(kit.Combobox<City>, { isItem: isCity, onValueChange: (city: City | null) => picked.push(city) }, [
			h(kit.ComboboxInput, { key: "i" }),
			h(
				kit.ComboboxContent,
				{ key: "c" },
				h(
					kit.ComboboxList,
					null,
					TWIN_CITIES.map((city) => h(kit.ComboboxItem, { key: city.id, value: city }, city.label)),
				),
			),
		]),
	);
	inputIn("[role='combobox']").click();
	await settle();
	all("[data-slot='combobox-item']")[1]?.click();
	await settle();
	check("COMBOBOX CHILDREN: isItem types items written as children", [picked[0]?.id], [2]);
}

{
	await draw(null);
	await draw(
		h(kit.Calendar, { mode: "single", defaultMonth: SEPTEMBER, today: TODAY, disabled: TODAY, endMonth: SEPTEMBER }),
	);
	const stops = all("[tabindex='0']");
	check(
		"CALENDAR ALLOWED: the tab stop leaves a disabled today for the first allowed day",
		stops.map((stop) => [stop.dataset["date"], stop.hasAttribute("disabled")]),
		[["2026-8-1", false]],
	);
	check(
		"and a day past endMonth is disabled like any other",
		found(host, "[data-date='2026-9-1'][data-outside]").hasAttribute("disabled"),
		true,
	);
}

{
	const ODD_MATCHERS: Matchers = JSON.parse('[{ "before": "2026-09-10" }]');
	const warned: unknown[] = [];
	const warn = console.warn;
	console.warn = (line: unknown) => warned.push(line);
	await draw(null);
	await draw(h(kit.Calendar, { mode: "single", defaultMonth: SEPTEMBER, today: TODAY, disabled: ODD_MATCHERS }));
	console.warn = warn;
	check(
		"CALENDAR MATCHERS: a matcher of an unknown shape disables no day of the drawn month and is said once",
		[
			all(".wg-kit-cal-day").length,
			all(".wg-kit-cal-day[disabled]").length,
			warned.filter((line) => String(line).includes("unknown shape")).length,
		],
		[42, 0, 1],
	);
}

{
	const RealDate = Date;
	const clock = { now: new RealDate(2026, 8, 3).getTime() };
	const FakeDate = new Proxy(RealDate, {
		construct: (target, args) => Reflect.construct(target, args.length === 0 ? [clock.now] : args),
	});
	Object.assign(globalThis, { Date: FakeDate });
	await draw(null);
	await draw(h(kit.Calendar, { mode: "single", defaultMonth: SEPTEMBER }));
	clock.now = new RealDate(2026, 8, 20).getTime();
	await draw(h(kit.Calendar, { mode: "single", defaultMonth: SEPTEMBER, className: "redrawn" }));
	const today = found(host, ".is-today").getAttribute("data-date");
	Object.assign(globalThis, { Date: RealDate });
	check("CALENDAR TODAY: today is read once, not again on every draw", today, "2026-8-3");
}

await draw(null);
console.log(failed ? `\n${failed} failed` : `\nall passed (${checks} checks)`);
process.exit(failed ? 1 : 0);
