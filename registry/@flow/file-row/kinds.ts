import type { Kind } from "./types";

export const KINDS: Record<string, Kind> = {
	added: { icon: "file-plus", word: "Added", mark: "is-added" },
	modified: { icon: "file-pen", word: "Modified", mark: "is-modified" },
	renamed: { icon: "file-symlink", word: "Renamed", mark: "is-renamed" },
	deleted: { icon: "file-x", word: "Deleted", mark: "is-deleted" },
	binary: { icon: "binary", word: "Binary", mark: "is-binary" },
};

export function saidOf(value: unknown): string {
	return String(value ?? "").trim();
}
