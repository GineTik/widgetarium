import { findingAt } from "../finding.mjs";
import { ALLOWED_COMMENT_PREFIXES, DIRECTIVE_PREFIXES } from "../limits.mjs";

export const id = "comments";

export function check(source) {
	const prose = source.comments.filter(isProse).sort((left, right) => left.loc.start.line - right.loc.start.line);
	return blocksOf(prose).map(toFinding);
}

function isProse(comment) {
	const text = comment.value.trim();
	return (
		text.length > 0 &&
		!ALLOWED_COMMENT_PREFIXES.some((prefix) => text.startsWith(prefix)) &&
		!DIRECTIVE_PREFIXES.some((prefix) => text.startsWith(prefix))
	);
}

function blocksOf(comments) {
	const blocks = [];
	for (const comment of comments) {
		const open = blocks[blocks.length - 1];
		if (open && continuesBlock(open.last, comment)) {
			open.last = comment;
			open.lines += 1;
			continue;
		}
		blocks.push({ first: comment, last: comment, lines: comment.loc.end.line - comment.loc.start.line + 1 });
	}
	return blocks;
}

function continuesBlock(last, comment) {
	if (comment.type !== "CommentLine" || last.type !== "CommentLine") return false;
	return comment.loc.start.line === last.loc.end.line + 1;
}

function toFinding(block) {
	const width = block.lines > 1 ? ` over ${block.lines} lines` : "";
	const message = `prose comment${width} "${clip(block.first.value.trim())}"; only TODO: and TRADE-OFF: exist, every other fact belongs in a name`;
	return findingAt(id, "error", block.first, message);
}

function clip(text) {
	const single = text.split("\n")[0];
	return single.length <= 44 ? single : `${single.slice(0, 44)}…`;
}
