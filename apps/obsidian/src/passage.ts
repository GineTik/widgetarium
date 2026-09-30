import { TFile } from "obsidian";
import type { App } from "obsidian";
import { findLines, replaceLines } from "@widgetarium/core/engine/text-span.js";
import { refuseRead } from "@widgetarium/core/engine/read-file.js";
import type { Here, PassageReader, PassageRecord } from "@widgetarium/core/gateway/host.js";
import { renderSpan } from "./substitution.js";
import type { Rule } from "./substitution.js";

export interface SectionLines {
	readonly text: string;
	readonly lineStart: number;
	readonly lineEnd: number;
}

export interface PassageAsk {
	readonly app: App;
	readonly sourcePath: string;
	readonly rawLines: readonly string[];
	readonly rule: Rule;
	readonly content: string;
	readonly section: SectionLines | null | undefined;
}

export function passageHere({ app, sourcePath, rawLines, rule, content, section }: PassageAsk): Here<PassageRecord> {
	const spelled = renderSpan(rule, content) !== null;
	const located = section ? findLines(section.text.split("\n"), rawLines, section.lineStart, section.lineEnd + 1) : -1;

	return {
		of: "passage",
		content,
		canUpdate: spelled && located >= 0,
		async get() {
			const file = app.vault.getAbstractFileByPath(sourcePath);
			const frontmatter = file instanceof TFile ? app.metadataCache.getFileCache(file)?.frontmatter : undefined;
			const props: Record<string, unknown> = file ? { ...(frontmatter ?? {}) } : {};
			return { of: "passage", path: sourcePath, props, content };
		},
		async update(next) {
			const lines = renderSpan(rule, next);
			const file = app.vault.getAbstractFileByPath(sourcePath);
			if (!lines || !(file instanceof TFile) || located < 0) return false;
			await app.vault.process(file, (text) => {
				const all = text.split("\n");
				const locatedInsideTheWrite = findLines(all, rawLines);
				if (locatedInsideTheWrite < 0) return text;
				return replaceLines(all, locatedInsideTheWrite, rawLines.length, lines).join("\n");
			});
			return true;
		},
	};
}

export function passageReader(reader: PassageReader | null | undefined, writtenInThePassage: string): PassageReader {
	return {
		canRead: Boolean(reader?.canRead),
		async read(link, options) {
			const named = String(link ?? "").trim();
			if (!reader || !named || !writtenInThePassage.includes(named))
				return refuseRead(`${named || "that file"} is not named here`);
			return reader.read(named, options);
		},
	};
}
