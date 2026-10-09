import { execFileSync } from "node:child_process";
import { scopeFolderOf, type CatalogueEntry } from "./catalogue-read.js";

export interface WidgetOrigin {
	readonly from: string;
	readonly registry: string;
	readonly commit: string;
	readonly installedAt: string;
}

export const ORIGIN_FILE = "origin.json";

const LOCAL = "local";
const UNPINNED = "unpinned";
const PINNED_COMMIT = /\/([0-9a-f]{40})(?:\/|$)/;

export function originOf(entry: CatalogueEntry, installedAt: Date): WidgetOrigin {
	return {
		from: entry.id,
		registry: entry.reader.at,
		commit: commitOf(entry),
		installedAt: installedAt.toISOString(),
	};
}

function commitOf(entry: CatalogueEntry): string {
	const { folder } = entry.reader;
	if (folder === null) return PINNED_COMMIT.exec(entry.reader.at)?.[1] ?? UNPINNED;
	return committedHeadOf(folder, scopeFolderOf(entry)) ?? LOCAL;
}

function committedHeadOf(repository: string, scopeFolder: string): string | null {
	const changed = gitSaid(repository, ["status", "--porcelain", "--", scopeFolder]);
	if (changed === null || changed !== "") return null;
	return gitSaid(repository, ["rev-parse", "HEAD"]);
}

function gitSaid(repository: string, args: readonly string[]): string | null {
	try {
		return execFileSync("git", ["-C", repository, ...args], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
	} catch {
		return null;
	}
}
