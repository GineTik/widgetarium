import type { App } from "obsidian";
import { standIn } from "./stand-in.ts";

const { warmLikelyNotes } = await import("../apps/obsidian/src/note-warming.js");
const { isScreenNote } = await import("../apps/obsidian/src/board-note.js");

let failed = 0;
let checks = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	checks += 1;
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "ok  " : "FAIL"} ${what}${ok ? "" : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(wanted)}`}`,
	);
}

const SCREEN = { widgetarium: { kind: "screen" } };
const frontmatterByPath: Record<string, object> = {
	"Screens/Board.md": SCREEN,
	"Journal/Today.md": { tags: ["daily"] },
	"Plain.md": {},
};
const read: string[] = [];
let inFlight = 0;
let peakInFlight = 0;
const app = standIn<App>(
	{
		vault: {
			getMarkdownFiles: () => Object.keys(frontmatterByPath).map((path) => ({ path })),
			adapter: {
				read: async (path: string) => {
					read.push(path);
					inFlight += 1;
					peakInFlight = Math.max(peakInFlight, inFlight);
					await new Promise((done) => setTimeout(done, 5));
					inFlight -= 1;
					if (path === "Gone.md") throw new Error("evicted and offline");
					return "";
				},
			},
		},
		metadataCache: {
			getFileCache: (file: { path: string }) => ({ frontmatter: frontmatterByPath[file.path] }),
		},
		workspace: { getLastOpenFiles: () => ["Journal/Today.md", "Screens/Board.md", "Gone.md", "Pictures/cat.png"] },
	},
	["vault", "metadataCache", "workspace"],
	"app",
);

check("the fixture's screen note is a screen note", isScreenNote(SCREEN), true);
const warmed = await warmLikelyNotes(app);
check("the recent notes and every screen note are read once each, pictures and plain notes left alone", read, [
	"Journal/Today.md",
	"Screens/Board.md",
	"Gone.md",
]);
check("a note that cannot be read is passed over, not thrown", warmed, 3);
check("the downloads overlap instead of waiting on each other", peakInFlight, 3);

console.log(`\n${checks - failed}/${checks} note warming checks passed`);
process.exit(failed === 0 ? 0 : 1);
