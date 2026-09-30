import { createElement as h } from "react";
import type { ReactNode } from "react";

const NAMED_LINE = /^(\s*)([\w.$-]+)(:)([\s\S]*)$/;

export function yamlSpans(text: unknown): ReactNode[] {
	const out: ReactNode[] = [];
	String(text ?? "")
		.split("\n")
		.forEach((line, at) => {
			if (at > 0) out.push("\n");
			out.push(...yamlLine(line, at));
		});
	return out;
}

function commentAt(line: string): number {
	let quoted = "";
	for (let at = 0; at < line.length; at += 1) {
		const letter = line[at];
		if (quoted) {
			if (letter === quoted) quoted = "";
			continue;
		}
		if (letter === '"' || letter === "'") quoted = letter;
		else if (letter === "#") return at;
	}
	return -1;
}

function yamlLine(line: string, at: number): ReactNode[] {
	const cut = commentAt(line);
	const said = cut === -1 ? line : line.slice(0, cut);
	const note = cut === -1 ? "" : line.slice(cut);
	const out = namedParts(said, at);
	if (note)
		out.push(
			<span className="is-note" key={`n${at}`}>
				{note}
			</span>,
		);
	return out;
}

function namedParts(said: string, at: number): ReactNode[] {
	const named = NAMED_LINE.exec(said);
	if (!named) return [said];
	return [
		named[1],
		<span className="is-key" key={`k${at}`}>
			{named[2]}
		</span>,
		named[3],
		named[4],
	];
}
