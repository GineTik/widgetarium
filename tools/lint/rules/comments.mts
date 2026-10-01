import type { Comment } from "@babel/types";
import { findingAt, type Finding } from "../finding.mts";
import { ALLOWED_COMMENT_PREFIXES, DIRECTIVE_PREFIXES } from "../limits.mts";
import type { ParsedSource } from "../source.mts";

interface CommentBlock {
	readonly first: Comment;
	last: Comment;
	lines: number;
}

const CLIPPED_AT = 44;

export const id = "comments";

export function check(source: ParsedSource): Finding[] {
	const prose = source.comments.filter(isProse).sort((left, right) => startLineOf(left) - startLineOf(right));
	return blocksOf(prose).map(toFinding);
}

function isProse(comment: Comment): boolean {
	const text = comment.value.trim();
	return (
		text.length > 0 &&
		!ALLOWED_COMMENT_PREFIXES.some((prefix) => text.startsWith(prefix)) &&
		!DIRECTIVE_PREFIXES.some((prefix) => text.startsWith(prefix))
	);
}

function blocksOf(comments: readonly Comment[]): CommentBlock[] {
	const blocks: CommentBlock[] = [];
	for (const comment of comments) {
		const open = blocks.at(-1);
		if (open && continuesBlock(open.last, comment)) {
			open.last = comment;
			open.lines += 1;
			continue;
		}
		blocks.push({ first: comment, last: comment, lines: endLineOf(comment) - startLineOf(comment) + 1 });
	}
	return blocks;
}

function continuesBlock(last: Comment, comment: Comment): boolean {
	if (comment.type !== "CommentLine" || last.type !== "CommentLine") return false;
	return startLineOf(comment) === endLineOf(last) + 1;
}

function toFinding(block: CommentBlock): Finding {
	const width = block.lines > 1 ? ` over ${block.lines} lines` : "";
	const message = `prose comment${width} "${clip(block.first.value.trim())}"; only TODO: and TRADE-OFF: exist, every other fact belongs in a name`;
	return findingAt(id, "error", block.first, message);
}

function clip(text: string): string {
	const single = text.split("\n")[0] ?? "";
	return single.length <= CLIPPED_AT ? single : `${single.slice(0, CLIPPED_AT)}…`;
}

function startLineOf(comment: Comment): number {
	return comment.loc?.start.line ?? 0;
}

function endLineOf(comment: Comment): number {
	return comment.loc?.end.line ?? 0;
}
