import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { isObject } from "../packages/core/src/engine/is-object.js";
import { bundleOf, shoot, shotPage, type ShotSize, type Theme } from "./harness.ts";

const { WIDGETS_DIR, GRID, spanToPixels } = await import("../packages/core/src/paths.js");

const SOURCE = "registry";
const THEMES: readonly Theme[] = ["light", "dark"];
const MAX_SPAN = { w: 6, h: 6 };
const DEFAULT_SPAN: SpanSize = { w: 4, h: 3 };
export const SHOT_NAMES: Readonly<Record<Theme, string>> = { light: "shot-light.png", dark: "shot-dark.png" };

export interface WidgetFolder {
	readonly id: string;
	readonly folder: string;
}

interface SpanSize {
	readonly w: number;
	readonly h: number;
}

interface PageCount {
	readonly drawn?: unknown;
	readonly said?: unknown;
	readonly letters?: unknown;
}

interface WidgetToShoot extends WidgetFolder {
	readonly work: string;
	readonly files: Readonly<Record<string, string>>;
	readonly bundle: string;
}

interface ThemeToShoot extends WidgetToShoot {
	readonly theme: Theme;
	readonly box: ShotSize;
}

type ThemeShot = { readonly ok: true; readonly said: string } | { readonly ok: false; readonly failure: string };

function collect(from: string, into: Record<string, string>, prefix: string): Record<string, string> {
	for (const entry of readdirSync(from)) {
		const full = path.join(from, entry);
		const key = `${prefix}/${entry}`;
		if (statSync(full).isDirectory()) collect(full, into, key);
		else if (/\.(json|tsx|ts|jsx|js|css)$/.test(entry)) into[key] = readFileSync(full, "utf8");
	}
	return into;
}

export function widgetFolders(root = SOURCE): WidgetFolder[] {
	const found: WidgetFolder[] = [];
	for (const scope of readdirSync(root).filter((name) => name.startsWith("@"))) {
		for (const name of readdirSync(path.join(root, scope))) {
			const folder = path.join(root, scope, name);
			if (existsSync(path.join(folder, "manifest.json"))) found.push({ id: `${scope}/${name}`, folder });
		}
	}
	return found;
}

function fieldOf(value: unknown, key: string): unknown {
	return isObject(value) ? value[key] : undefined;
}

function isSpanSize(value: unknown): value is SpanSize {
	return isObject(value) && typeof value["w"] === "number" && typeof value["h"] === "number";
}

function declaredSpanOf(manifest: unknown): SpanSize {
	const declared = fieldOf(fieldOf(manifest, "preview"), "size") ?? fieldOf(manifest, "defaultSize");
	return isSpanSize(declared) ? declared : DEFAULT_SPAN;
}

// TRADE-OFF: the card caps a long span, so a shot taken past the cap is squeezed into a frame of another shape
export function shotBox(manifest: unknown): ShotSize {
	const size = declaredSpanOf(manifest);
	const w = Math.min(size.w, MAX_SPAN.w);
	const h = Math.min(size.h, MAX_SPAN.h);
	return {
		width: spanToPixels(w, GRID.cellPx, GRID.gapPx),
		height: spanToPixels(h, GRID.cellPx, GRID.gapPx),
	};
}

const { contentHash } = await import("../packages/core/src/engine/content-hash.js");

const WIDGET_SOURCES = ["widget.tsx", "widget.ts", "widget.jsx", "widget.js", "widget.css"];

function readManifest(folder: string): Readonly<Record<string, unknown>> {
	const parsed: unknown = JSON.parse(readFileSync(path.join(folder, "manifest.json"), "utf8"));
	return isObject(parsed) ? parsed : {};
}

function previewWithoutShot(manifest: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
	const preview = manifest["preview"];
	if (!isObject(preview)) return {};
	return Object.fromEntries(Object.entries(preview).filter(([key]) => key !== "shot"));
}

export function shotInputHash(folder: string): string {
	const manifest = readManifest(folder);
	const preview = previewWithoutShot(manifest);
	const scope = path.dirname(folder);
	const read = (at: string): string => (existsSync(at) ? readFileSync(at, "utf8") : "");
	return contentHash(
		[
			JSON.stringify({ ...manifest, preview }),
			...WIDGET_SOURCES.map((name) => read(path.join(folder, name))),
			read(path.join(scope, "lib.js")),
			read(path.join(scope, "tokens.css")),
			read("styles.css"),
		].join(" "),
	);
}

function stampShot(folder: string, of: string): void {
	const at = path.join(folder, "manifest.json");
	const manifest = readManifest(folder);
	const held = manifest["preview"];
	const preview = { ...(isObject(held) ? held : {}), shot: { of } };
	writeFileSync(at, `${JSON.stringify({ ...manifest, preview }, null, "\t")}\n`);
}

const NO_HARNESS_CHROME =
	`<style>body{padding:0!important;display:block!important}.harness-top{display:none!important}` +
	`#host{position:fixed;left:0;top:0}.wg-cat-stage{place-items:start!important;padding:0!important}` +
	`.wg-cat-frame::after{content:none!important}</style>`;

function pageFor({ theme, id, files, bundle }: ThemeToShoot): string {
	return shotPage({
		theme,
		title: "",
		lead: "",
		body:
			NO_HARNESS_CHROME +
			`<script>window.__FILES__=${JSON.stringify(files)};window.__WANTED__=${JSON.stringify(id)};</script>\n<script>${bundle}</script>`,
	});
}

function pageCountOf(counted: string): PageCount {
	const parsed: unknown = JSON.parse(counted.replace(/&quot;/g, '"') || "{}");
	return isObject(parsed) ? parsed : {};
}

function whatThePageReported(file: string, box: ShotSize): { readonly said: string; readonly seen: PageCount } {
	const dom = shoot(file, ["--dump-dom"], box);
	const said = /<pre id="boom"[^>]*>([\s\S]*?)<\/pre>/.exec(dom)?.[1]?.trim() ?? "";
	const counted = /<pre id="count"[^>]*>([\s\S]*?)<\/pre>/.exec(dom)?.[1] ?? "";
	return { said, seen: pageCountOf(counted) };
}

function shootOneTheme(asked: ThemeToShoot): ThemeShot {
	const { id, folder, theme, box, work } = asked;
	const file = path.join(work, `${id.replace("/", "-")}-${theme}.html`);
	writeFileSync(file, pageFor(asked));

	const out = path.join(folder, SHOT_NAMES[theme]);
	mkdirSync(path.dirname(out), { recursive: true });
	shoot(file, [`--screenshot=${out}`], box);

	const { said, seen } = whatThePageReported(file, box);
	if (said) return { ok: false, failure: said };
	if (!seen.drawn) return { ok: false, failure: "nothing was drawn" };

	const kilobytes = Math.round(statSync(out).size / 1024);
	const drew = JSON.stringify(typeof seen.said === "string" ? seen.said.slice(0, 60) : "");
	return { ok: true, said: `${String(kilobytes).padStart(4)}kb  ${String(seen.letters)} letters  ${drew}` };
}

function shootBothThemes(asked: WidgetToShoot): number {
	const box = shotBox(readManifest(asked.folder));
	let broken = 0;
	for (const theme of THEMES) {
		const done = shootOneTheme({ ...asked, theme, box });
		if (!done.ok) {
			broken += 1;
			console.error(`!!  ${asked.id} ${theme}: ${done.failure}`);
			continue;
		}
		const size = `${String(box.width).padStart(4)}x${String(box.height).padEnd(4)}`;
		console.log(`OK  ${asked.id.padEnd(24)} ${theme.padEnd(5)} ${size} ${done.said}`);
	}
	return broken;
}

async function shootEveryWidget(asked: readonly string[]): Promise<number> {
	const files = collect(SOURCE, {}, WIDGETS_DIR);
	const bundle = await bundleOf("tools/widget-card-page.tsx");
	const work = mkdtempSync(path.join(tmpdir(), "wg-shot-"));
	const wanted = widgetFolders().filter((entry) => asked.length === 0 || asked.includes(entry.id));

	let failed = 0;
	for (const { id, folder } of wanted) {
		const broken = shootBothThemes({ id, folder, work, files, bundle });
		if (!broken) stampShot(folder, shotInputHash(folder));
		failed += broken;
	}
	return failed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const failures = await shootEveryWidget(process.argv.slice(2).filter((word) => !word.startsWith("--")));
	process.exit(failures ? 1 : 0);
}
