import fs from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { measuredSide, reported, shapeOf } from "./design-diff.mjs";
import { colorless } from "./color-distance.mjs";

const DRAFT = "docs/reference/metric-total-draft/Main.dc.html";

const PARTS = {
	tile: ".tile",
	title: ".title",
	seg: ".seg",
	trend: ".trend",
	plate: ".plate",
	period: ".period",
	btn: ".btn",
	icon: ".icon-btn",
	chart: ".chart",
};

const MUTATIONS = [
	{ name: "shape", part: "plate", what: "shape", from: "border-radius: 22px", to: "border-radius: 0px" },
	{ name: "size", part: "title", what: "fontSize", from: ".title { font-size: 15px", to: ".title { font-size: 19px" },
	{
		name: "blur",
		part: "plate",
		what: "backdrop",
		from: "backdrop-filter: var(--wg-plate-blur)",
		to: "backdrop-filter: none",
	},
	{
		name: "pattern",
		part: "chart",
		what: "pattern tile",
		from: `<pattern id="dots" width="14" height="14"`,
		to: `<pattern id="dots" width="28" height="28"`,
	},
	{ name: "colour", part: "trend", what: "color", from: `up: "#1f8a4c"`, to: `up: "#1f4c8a"` },
	{ name: "warn band", part: "trend", what: "color", from: `up: "#1f8a4c"`, to: `up: "#268f53"`, level: "warn" },
	{ name: "absence", part: "btn", what: "presence", from: `class="btn"`, to: `class="btn" style="display:none"` },
	{
		name: "alpha",
		part: "plate",
		what: "background",
		from: "--wg-plate: color-mix(in srgb, var(--ink) 4.5%, transparent)",
		to: "--wg-plate: color-mix(in srgb, var(--ink) 4.5%, rgba(0, 0, 0, 0.5))",
	},
	{
		name: "typeface",
		part: "title",
		what: "fontFamily",
		from: `font-family: -apple-system`,
		to: `font-family: Georgia`,
	},
	{ name: "a shadow layer moved", part: "tile", what: "shadow 2 offset", from: "0 6px 47px", to: "0 18px 47px" },
	{
		name: "a shadow layer darkened",
		part: "tile",
		what: "shadow 2 colour",
		from: "rgba(0, 0, 0, 0.035)",
		to: "rgba(0, 0, 0, 0.5)",
	},
	{
		name: "a shadow layer dropped",
		part: "tile",
		what: "shadow layers",
		from: ", 0 4px 8px rgba(0, 0, 0, 0.005)",
		to: "",
	},
	{
		name: "an inset ring turned outward",
		part: "tile",
		what: "shadow 1 inset",
		from: "box-shadow: inset 0 0 0 1px color-mix",
		to: "box-shadow: 0 0 0 1px color-mix",
	},
	{
		name: "a layer that lost a number",
		part: "tile",
		what: "shadow 2 offset",
		from: "0 6px 47px rgba(0, 0, 0, 0.035)",
		to: "6px 47px rgba(0, 0, 0, 0.035)",
	},
	{
		name: "type on a reading part",
		part: "title",
		what: "fontSize",
		from: ".title { font-size: 15px",
		to: ".title { font-size: 21px",
	},
];

const TEXTLESS = {
	name: "a textless part",
	from: ".icon-btn {",
	to: ".icon-btn { font-size: 44px; letter-spacing: 3px;",
};

const TYPE_WORDS = ["fontFamily", "fontSize", "fontWeight", "letterSpacing"];

const work = mkdtempSync(path.join(tmpdir(), "wg-diff-test-"));
const sides = { size: [900, 560] };
let failed = 0;

function check(name, got, want) {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
}

function mutantOf(mutation, at) {
	const held = fs.readFileSync(DRAFT, "utf8");
	if (!held.includes(mutation.from)) throw new Error(`the mutation "${mutation.name}" matched nothing in ${DRAFT}`);
	const file = path.join(work, `${at}.dc.html`);
	fs.writeFileSync(file, held.replace(mutation.from, mutation.to));
	return file;
}

const design = await measuredSide(DRAFT, PARTS, sides, work);

check("every part of the design is drawn", Object.values(design).filter((one) => !one.present).length, 0);
const againstItself = reported(PARTS, design, design);
check(
	"the design against itself reports no difference",
	againstItself.filter((one) => one.level !== "note"),
	[],
);
check(
	"a part with no text on either side is said to be unmeasured, not passed",
	againstItself.filter((one) => one.part === "icon").map((one) => `${one.what}/${one.level}`),
	["typography/note"],
);

const unpaired = await measuredSide(DRAFT, { ...PARTS, absent: ".no-such-thing" }, sides, work);
check(
	"a part neither side draws is an error, not silence",
	reported({ absent: 1 }, unpaired, unpaired).map((one) => `${one.what}/${one.level}`),
	["pairing/error"],
);

for (const [at, mutation] of MUTATIONS.entries()) {
	const measuredMutant = await measuredSide(mutantOf(mutation, at), PARTS, sides, work);
	const found = reported(PARTS, design, measuredMutant);
	const hit = found.filter((one) => one.part === mutation.part && one.what === mutation.what);
	check(
		`${mutation.name} is caught`,
		hit.map((one) => one.level),
		[mutation.level ?? "error"],
	);
}

const hushed = await measuredSide(mutantOf(TEXTLESS, "textless"), { icon: PARTS.icon }, sides, work);
check(
	"a textless part's type is never compared, however far apart it is",
	reported({ icon: 1 }, design, hushed).filter((one) => TYPE_WORDS.includes(one.what)).length,
	0,
);

const KIT_DRAWN = "docs/reference/metric-total/Main.dc.html";
const kit = await measuredSide(KIT_DRAWN, { add: ".mt-foot .wg-kit-btn:not(.mt-period)" }, sides, work);
check("the fixture still draws a kit control to read", kit.add.present, true);
check("a control with a label is measured as reading", kit.add.reads, true);
check("a kit control's fill is read off its ::before, not off the bare element", colorless(kit.add.background), false);
check("one painted surface, not two", kit.add.shared, false);
check("a kit control's corner is read off its ::before", shapeOf(kit.add.radii, kit.add.width, kit.add.height), "pill");

const blind = path.join(work, "blind.dc.html");
fs.writeFileSync(
	blind,
	fs.readFileSync(DRAFT, "utf8").replace("class Component extends DCLogic", "class Component extends NotAThing"),
);
const why = await measuredSide(blind, PARTS, sides, work).then(
	() => "it measured a page that never drew",
	(thrown) => thrown.message,
);
check(
	"a page that cannot draw is refused",
	why.includes("never reported itself drawn") && why.includes("NotAThing"),
	true,
);

console.log(`\ndesign-diff: ${failed === 0 ? "every check falsified and restored" : `${failed} check(s) failed`}`);
process.exit(failed === 0 ? 0 : 1);
