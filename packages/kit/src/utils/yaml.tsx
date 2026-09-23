import { createElement as h } from "react";

function commentAt(line) {
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

function yamlLine(line, at) {
	const cut = commentAt(line);
	const said = cut === -1 ? line : line.slice(0, cut);
	const note = cut === -1 ? "" : line.slice(cut);
	const named = /^(\s*)([\w.$-]+)(:)([\s\S]*)$/.exec(said);
	const out = named
		? [
				named[1],
				<span className="is-key" key={`k${at}`}>
					{named[2]}
				</span>,
				named[3],
				named[4],
			]
		: [said];
	if (note)
		out.push(
			<span className="is-note" key={`n${at}`}>
				{note}
			</span>,
		);
	return out;
}

export function yamlSpans(text) {
	const out = [];
	String(text ?? "")
		.split("\n")
		.forEach((line, at) => {
			if (at > 0) out.push("\n");
			out.push(...yamlLine(line, at));
		});
	return out;
}
