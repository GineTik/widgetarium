import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged } from "./chrome-ask.ts";
import { bundleOf, shotPage } from "./harness.ts";

type ItemTwin = readonly [string, unknown, unknown];

const READY = `new Promise((done, fail) => {
	const started = Date.now();
	const poll = () => (window.ready === true ? done(true) : Date.now() - started > 15000 ? fail(new Error("the item twins page never drew")) : setTimeout(poll, 50));
	poll();
})`;

const MEASURED = `(() => {
	const rowsOf = (id) => [...document.querySelectorAll("#" + id + " .wg-kit-item-group > *")];
	const frame = (el) => {
		const style = getComputedStyle(el);
		const after = getComputedStyle(el, "::after");
		return {
			pad: style.padding,
			width: Math.round(el.getBoundingClientRect().width),
			line: style.borderTopWidth + " " + style.borderTopStyle + " " + style.borderTopColor,
			inset: after.content === "none" ? null : after.left,
		};
	};
	const height = (el) => Math.round(el.getBoundingClientRect().height);
	const plate = (el) => {
		if (!el) return null;
		const style = getComputedStyle(el);
		return [style.backgroundColor, style.borderRadius, style.padding];
	};
	const group = document.querySelector("#item-group .wg-kit-item-group");
	return {
		layoutItems: rowsOf("rows-li").map(frame),
		items: rowsOf("item-rows").map(frame),
		listRowHeights: [...document.querySelectorAll("#list-row .wg-kit-row")].map(height),
		itemHeights: rowsOf("item-list").map((row) => height(row) - parseFloat(getComputedStyle(row).borderTopWidth)),
		groupPlates: [...document.querySelectorAll("#item-group [data-surface]")].map((el) => el.getAttribute("data-surface")),
		groupLines: rowsOf("item-group").map((row) => frame(row).line),
		groupSeparators: document.querySelectorAll("#item-group [data-slot='item-separator']").length,
		groupFill: group && getComputedStyle(group).backgroundColor,
		card: plate(document.querySelector("#card [data-surface]")),
		muted: plate(document.querySelector("#muted [data-surface]")),
	};
})()`;

interface Measured {
	readonly layoutItems: readonly unknown[];
	readonly items: readonly unknown[];
	readonly listRowHeights: readonly number[];
	readonly itemHeights: readonly number[];
	readonly groupPlates: readonly unknown[];
	readonly groupLines: readonly string[];
	readonly groupSeparators: number;
	readonly groupFill: string | null;
	readonly card: readonly string[] | null;
	readonly muted: readonly string[] | null;
}

function isMeasured(value: unknown): value is Measured {
	return typeof value === "object" && value !== null && "layoutItems" in value && "muted" in value;
}

export async function itemTwinChecks(): Promise<readonly ItemTwin[]> {
	const body = `<script>${await bundleOf("tools/twins-item-page.tsx")}</script>`;
	const file = path.join(mkdtempSync(path.join(tmpdir(), "wg-item-twins-")), "page.html");
	writeFileSync(file, shotPage({ theme: "light", title: "Item twins", lead: "", body }));
	const page = await paged(file, "item twins paint", { size: [440, 1400] });
	try {
		await page.ask(READY);
		const measured = await page.ask(MEASURED);
		if (!isMeasured(measured)) return [["the item twins page answered", measured, "a measurement"]];
		return twinsOf(measured);
	} finally {
		page.close();
	}
}

function twinsOf(measured: Measured): readonly ItemTwin[] {
	const afterSeparator = measured.groupLines.at(-1);
	return [
		["AN ITEM IN A GROUP STANDS AT LAYOUTITEM'S PADDING, WIDTH AND HAIRLINE", measured.items, measured.layoutItems],
		["and is as tall as the List Row holding the same parts", measured.itemHeights, measured.listRowHeights],
		["AN ITEMGROUP IS NO PLATE", measured.groupPlates, []],
		[
			"a separator written in it is the one hairline, the item after it adding none",
			[measured.groupSeparators, afterSeparator?.startsWith("0px")],
			[1, true],
		],
		["and nothing is painted under it", measured.groupFill, "rgba(0, 0, 0, 0)"],
		["A MUTED ITEM IS THE GREY CARD: fill, corner and padding", measured.muted, measured.card],
	];
}
