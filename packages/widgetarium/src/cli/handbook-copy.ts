import fs from "node:fs";
import path from "node:path";

export const HANDBOOK_FOLDER = "widgetarium";
export const HANDBOOK_PAGES: readonly string[] = [
	"widget.md",
	"board.md",
	"surfaces.md",
	"examples.md",
	"kit.md",
	"design-system.md",
	"catalogue.md",
];

export function copyHandbook(handbook: string, target: string): void {
	fs.mkdirSync(target, { recursive: true });
	for (const page of HANDBOOK_PAGES) fs.copyFileSync(path.join(handbook, page), path.join(target, page));
}
