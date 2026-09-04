// THE IDEAL IS A FILE, AND THIS COMPARES US TO IT. docs/reference/orbitask-converted.html is the
// accepted design; every number below is read out of it at run time rather than copied here, so
// the day the reference changes this fails instead of quietly going stale.
import { readFileSync, readdirSync } from "node:fs";

const ref = readFileSync("docs/reference/orbitask-converted.html", "utf8");
// CONTEXT: the approved design for the parts the task dialog is built from
const dialogRef = readFileSync("docs/reference/task-dialog.html", "utf8");
const widgetSourceAt = (folder) => {
	for (const ext of ["tsx", "ts", "jsx", "js"]) {
		try {
			return readFileSync(`${folder}/widget.${ext}`, "utf8");
		} catch {}
	}
	return "";
};
const ours = readFileSync("styles.css", "utf8") + readFileSync("widgets/@task/tokens.css", "utf8")
	+ readdirSync("widgets/@task").filter((n) => !n.endsWith(".css"))
		.map((n) => widgetSourceAt(`widgets/@task/${n}`)).join("\n");

// PULL ONE DECLARATION OUT OF THE BASE RULE. Taking the first rule whose selector merely ENDS
// with the class read a variant instead: adding `.wg-kit-seg.is-s .wg-kit-seg-thumb` above the
// base made this gate compare a small control against the ideal's normal one and call it a
// mismatch. The base is the LEAST QUALIFIED rule — the one carrying the fewest classes.
const decl = (css, selector, prop) => {
	const rules = [...css.matchAll(new RegExp(`([^{}]*)\\${selector}\\s*\\{([^}]*)\\}`, "g"))];
	if (rules.length === 0) return null;
	const base = rules.reduce((fewest, rule) =>
		(rule[1].match(/\./g) ?? []).length < (fewest[1].match(/\./g) ?? []).length ? rule : fewest);
	const m = base[2].match(new RegExp(`(?:^|;|\\n)\\s*${prop}\\s*:\\s*([^;}]+)`));
	return m ? m[1].trim() : null;
};
const px = (css, sel, prop) => {
	const raw = decl(css, sel, prop);
	if (!raw) return null;
	const named = { "var(--size-4-2)": "8px", "var(--size-4-3)": "12px", "var(--size-4-4)": "16px",
		"var(--size-4-5)": "20px", "var(--size-2-3)": "6px", "var(--wg-radius-pill)": "999px" };
	// a var() with a fallback is the SAME value, just safer — compare the variable, not the spelling
	const bare = raw.replace(/var\((--[\w-]+),[^)]*\)/g, "var($1)");
	return named[bare] ?? bare;
};

let bad = 0;
const same = (what, a, b) => {
	// CONTEXT: both sides are CSS text — comparing them as anything looser proves nothing
	const ok = a !== null && a === b;
	if (!ok) bad += 1;
	console.log(`${ok ? "OK " : "!! "} ${what.padEnd(46)} ideal ${String(b).padEnd(12)} ours ${a}`);
};

// TWO TRAPS, both of which made a first draft of the specificity check pass on broken CSS: a
// comment mentioning a class parses as a selector and weighs more than any real one, and a comma
// inside :is() is not a separator. Strip the first, respect the depth for the second.
const withoutComments = ours.replace(/\/\*[\s\S]*?\*\//g, "");

const splitSelectors = (list) => {
	const parts = [];
	let depth = 0;
	let current = "";
	for (const character of list) {
		if (character === "(") depth += 1;
		if (character === ")") depth -= 1;
		if (character === "," && depth === 0) {
			parts.push(current);
			current = "";
			continue;
		}
		current += character;
	}
	parts.push(current);
	return parts.map((part) => part.trim().replace(/\s+/g, " ")).filter(Boolean);
};

// every `background` declared by a rule whose selector ENDS in this one — the whole list, so a
// second rule quietly repainting the same surface shows up instead of hiding behind the first
const backgroundsOf = (needle) => {
	const found = [];
	for (const block of withoutComments.split("}")) {
		const brace = block.indexOf("{");
		if (brace < 0) continue;
		if (!splitSelectors(block.slice(0, brace)).some((selector) => selector.endsWith(needle))) continue;
		// CONTEXT: past the brace — a single-line rule puts the property where ^, ; and \n cannot reach
		const body = block.slice(brace + 1);
		const declared = body.match(/(?:^|;|\n)\s*background\s*:\s*([^;}]+)/);
		if (!declared) continue;
		// CONTEXT: a rule may name its fill through a property it sets itself — follow that one hop
		const named = /^var\((--[\w-]+)\)$/.exec(declared[1].trim())?.[1];
		const own = named && body.match(new RegExp(`(?:^|;|\n)\\s*${named}\\s*:\\s*([^;}]+)`));
		found.push((own ? own[1] : declared[1]).trim());
	}
	return found;
};

console.log("— the shapes the ideal declares, against what we ship —\n");
same("capsule button height", px(ours, ".wg-kit-btn.is-m", "height"), px(ref, ".btn-m", "height"));
same("capsule button padding", px(ours, ".wg-kit-btn.is-m", "padding"), px(ref, ".btn-m", "padding"));
same("small button height", px(ours, ".wg-kit-btn.is-s", "height"), px(ref, ".btn-s", "height"));
same("icon button, medium", px(ours, ".wg-kit-icon.is-m", "width"), px(ref, ".iconbtn-m", "width"));
same("segmented padding", px(ours, ".wg-kit-seg", "padding"), px(ref, ".segmented", "padding"));
same("segmented tab height", px(ours, ".wg-kit-seg button", "height"), px(ref, ".segmented button", "height"));
same("thumb inset from the top", px(ours, ".wg-kit-seg-thumb", "top"), px(ref, ".seg-thumb", "top"));
same("field height", px(ours, ".wg-kit-field", "height"), px(ref, ".search", "height"));
same("field padding", px(ours, ".wg-kit-field", "padding"), px(ref, ".search", "padding"));
same("field gap", px(ours, ".wg-kit-field", "gap"), px(ref, ".search", "gap"));
same("pill padding", px(ours, ".wg-kit-pill", "padding"), px(ref, ".pilltag", "padding"));

console.log("\n— the tokens —");
const tok = (css, name) => (css.match(new RegExp(`\\n\\s*${name}:\\s*([^;]+);`)) ?? [])[1]?.trim() ?? null;
same("plate radius", tok(ours, "--wg-kit-plate"), "14px");
same("plate padding (tight)", tok(ours, "--wg-kit-plate-pad"), "8px");
// A FILL IS A RELATIONSHIP TO THE SURFACE, NEVER A POSITION ON A RAMP. The ramp belongs to the
// vault's theme and its dark shape is not guaranteed: stock Obsidian rises through base-20, the
// ramp recorded in docs/reference falls at it, because there base-20 is the chrome BEHIND the
// note. Same token, opposite direction — so the kit steps from the surface toward the ink, which
// no ramp can invert. These read the DEFINITION, not a spelling: pinning a step back fails
// however it is written, and so does mixing toward something that is not the ink.
const relational = (name, toward) => {
	const value = tok(ours, name) ?? "";
	const mixed = value.match(/^color-mix\(in srgb,\s*(.+?)\s+([\d.]+)%,\s*var\(--background-primary\)\)$/);
	same(`${name} is ${toward} into the surface`, mixed?.[1] ?? value, toward);
	same(`${name} names no ramp step`, /--color-base-\d/.test(value) ? value : 0, 0);
	return mixed ? Number(mixed[2]) : 0;
};
const restPercent = relational("--wg-kit-fill", "var(--text-normal)");
const hoverPercent = relational("--wg-kit-fill-hover", "var(--text-normal)");
const raisePercent = relational("--wg-kit-raise", "#ffffff");

// Measured on all three grounds of docs/reference/kit-dark-theme.html, hover against REST — the
// only separation a hover has to win. A +3 step reads 1.027 and is gone on a dim panel; +5 reads
// 1.116 light / 1.151 stock dark / 1.154 recorded dark, clearing the 1.10 that page sets as the
// floor for a surface step.
same("hover travels further toward the ink than rest", hoverPercent > restPercent, true);
same("and by a step that can be seen", hoverPercent - restPercent >= 5, true);
same("the raise actually lifts", raisePercent > 0, true);

// A RAISED THING PAINTED --background-primary SINKS. Once the fill steps toward the ink it is
// LIGHTER than the note on any dark ground, so a card, a thumb or a chip painted the note's own
// colour becomes the darkest thing in the control — elevation read backwards, which the shipping
// kit did on stock Obsidian. Measured on the recorded dark ramp: --background-primary lands 1.204
// BELOW its own fill, --wg-kit-raise 1.190 above it. Every surface that sits on a fill takes it.
for (const needle of [".wg-kit-card", ".wg-kit-seg-thumb", ".wg-kit-count", ".wg-kit-switch::after",
	".wg-kit-row .wg-kit-btn::before", ".wg-kit-row .wg-kit-icon::before"]) {
	same(`${needle} takes the raise`, backgroundsOf(needle).join(" | ") || "nothing", "var(--wg-kit-raise)");
}

// AND THE FIGHT THE HOST PICKS OVER `button`: its :not() selectors are (0,1,1), so a one-class
// kit rule loses its radius. Every kit rule must carry the root scope that makes it (0,2,0).
{
	const loose = ours.split("\n").filter((line) => /^\.wg-kit-[^{]*\{/.test(line));
	same("no kit rule is left at one-class specificity", loose.length, 0);
}

console.log("\n— things the ideal has that we must not have lost —");
for (const [what, needle] of [["the 28px avatar", "28px"], ["its -8px overlap", "-8px"], ["the 6px progress bar", "6px"], ["the 32px stripe", "32px"]]) {
	const ok = ours.includes(needle);
	if (!ok) bad += 1;
	console.log(`${ok ? "OK " : "!! "} ${what}`);
}
// A CONTROL THAT PAINTS ITS OWN BACKGROUND IS A SQUARE. The fill lives on ::before because a
// host stylesheet wins the radius on a bare `button`; the element's own radius is 0, so any rule
// that still sets `background` on the ELEMENT paints a square behind the round pseudo. That is
// how an accent tile, a switch and every hover state came back square.
{
	const painted = [".wg-kit-btn", ".wg-kit-icon", ".wg-kit-pop-item", ".wg-kit-seg button", ".wg-kit-switch", ".wg-kit-row", ".wg-kit-cal-day"];
	const offenders = [];
	for (const [index, line] of ours.split("\n").entries()) {
		if (!/\bbackground\s*:/.test(line) || /::before/.test(line)) continue;
		const selector = line.split("{")[0];
		if (painted.some((name) => selector.includes(name))) offenders.push(`styles.css:${index + 1} ${selector.trim()}`);
	}
	same("no kit control paints its own background", offenders.join(" | ") || 0, 0);
}

// A WIN THAT RESTS ON FILE ORDER IS NOT A WIN. Three separate bugs this session came from two
// rules setting the same property at EQUAL specificity, decided by whichever was written later:
// the card's radius, the tab's editing ring, and the dialog's close button. Where one rule has to
// beat another, say so in specificity — then appending a block cannot silently flip it.
{
	// :where() adds nothing, :is()/:not() take their most specific argument — that is the whole
	// trap, and it is why this is counted rather than eyeballed
	const weigh = (selector) => {
		const bare = selector.replace(/:where\([^)]*\)/g, "").replace(/:is\(([^)]*)\)/g, (_, inner) => inner.split(",")[0]);
		const ids = (bare.match(/#[\w-]+/g) ?? []).length;
		const classes = (bare.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[a-z-]+\(?/g) ?? []).length;
		const tags = (bare.match(/(^|[\s>+~])[a-z]+/g) ?? []).length;
		return ids * 100 + classes * 10 + tags;
	};

	const rulesSetting = (needle, property) => {
		const found = [];
		for (const block of withoutComments.split("}")) {
			const brace = block.indexOf("{");
			if (brace < 0) continue;
			if (!new RegExp(`(^|;|\\n)\\s*${property}\\s*:`).test(block.slice(brace + 1))) continue;
			for (const selector of splitSelectors(block.slice(0, brace))) {
				// a ::before rule does not compete for a property on the ELEMENT — different box
				if (selector.includes(needle) && !selector.includes("::")) found.push(selector);
			}
		}
		return found;
	};

	const beats = (winner, loser, property) => {
		const top = Math.max(0, ...rulesSetting(winner, property).map(weigh));
		const bottom = Math.max(0, ...rulesSetting(loser, property).map(weigh));
		same(`${winner} outranks ${loser} on ${property}`, top > bottom, true);
	};

	beats(".wg-dialog-close", ".wg-kit-icon", "position");
	// CONTEXT: a day can be today AND picked — picked wins, and says so in specificity
	beats(".is-picked", ".is-today", "color");
}

console.log("\n— docs/reference/task-dialog.html, the parts the dialog is built from —");
same("progress track height", px(ours, ".wg-kit-progress-track", "height"), px(dialogRef, ".pbar", "height"));
same("knob at rest", px(ours, ".wg-kit-progress-knob", "width"), px(dialogRef, ".pbar .knob", "width"));
same("knob while it is held", px(ours, ".wg-kit-progress.is-grabbed .wg-kit-progress-knob", "width"), px(dialogRef, ".pbar .knob.grabbed", "width"));
same("calendar day cell", px(ours, ".wg-kit-cal-day", "height"), px(dialogRef, ".cal-grid button", "height"));
same("the raw text's line height", px(ours, ".wg-kit-md-text", "line-height"), px(dialogRef, ".raw", "line-height"));
same("and its wrapping, which is what the mirror must match", px(ours, ".wg-kit-md-text", "white-space"), px(dialogRef, ".raw", "white-space"));

// CONTEXT: a floating panel is separated by its edge and the blur, never by a cast shadow
{
	const floating = [".wg-kit-pop", ".wg-dialog"];
	const offenders = [];
	for (const block of withoutComments.split("}")) {
		const brace = block.indexOf("{");
		if (brace < 0) continue;
		const selectors = splitSelectors(block.slice(0, brace));
		if (!selectors.some((selector) => floating.some((name) => selector.endsWith(name)))) continue;
		const declared = block.slice(brace + 1).match(/(?:^|;|\n)\s*box-shadow\s*:\s*([^;}]+)/);
		if (declared && !/inset|glass-edge|none/.test(declared[1])) offenders.push(`${selectors.join(", ")} → ${declared[1].trim()}`);
	}
	same("no floating panel drops a shadow", offenders.join(" | ") || 0, 0);
	same("the popover is separated by its edge", px(ours, ".wg-kit-pop", "box-shadow"), "var(--wg-kit-glass-edge)");
	same("and so is the dialog", px(ours, ".wg-dialog", "box-shadow"), "var(--wg-kit-glass-edge)");
}

console.log(bad ? `\n${bad} deviations from the ideal` : "\nno deviation from the ideal in any measured value");
process.exit(bad ? 1 : 0);
