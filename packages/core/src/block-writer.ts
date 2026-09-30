export const FENCE = "```";
export const BLOCK_LANGUAGE = "widgetarium";

const FENCE_OPEN = new RegExp(`^${FENCE}+\\s*${BLOCK_LANGUAGE}\\s*$`);
const FENCE_CLOSE = new RegExp(`^${FENCE}+\\s*$`);
const FRONTMATTER_FENCE = /^---\s*$/;

interface BlockLines {
	readonly start: number;
	readonly end: number;
}

interface BlockSection {
	readonly text: string;
	readonly lineStart: number;
}

interface EditorBlock {
	readonly replaceCode?: unknown;
	section(): BlockSection | null | undefined;
}

interface FenceScan {
	readonly blocks: BlockLines[];
	readonly unclosed: number;
}

export function findBlocks(lines: readonly string[]): BlockLines[] {
	return scanFences(lines).blocks;
}

export function unclosedBlockIn(lines: readonly string[]): number {
	return scanFences(lines).unclosed;
}

export function replaceBlock(
	text: string,
	blockIndex: number,
	body: string,
	isValidBlock?: ((written: string) => boolean) | null,
): string | null {
	const lines = text.split("\n");
	const blocks = findBlocks(lines);
	const block = blocks[blockIndex];
	if (!block || block.end <= block.start) return null;

	const bodyLines = body.trimEnd().split("\n");
	lines.splice(block.start + 1, block.end - block.start - 1, ...bodyLines);
	const next = lines.join("\n");

	const nextLines = next.split("\n");
	const nextBlocks = findBlocks(nextLines);
	const nextBlock = nextBlocks[blockIndex];
	if (nextBlocks.length !== blocks.length || !nextBlock) return null;

	const written = nextLines.slice(nextBlock.start + 1, nextBlock.end).join("\n");
	if (isValidBlock && !isValidBlock(written)) return null;
	return next;
}

// TRADE-OFF: replaceCode is Obsidian's unpublished method Bases writes through; the file write stays as the fallback
export function writeInEditor(editorBlock: EditorBlock | null | undefined, body: string): boolean {
	if (!editorBlock || typeof editorBlock.replaceCode !== "function") return false;
	const code = body.trimEnd();
	if (code.split("\n").some((line) => FENCE_CLOSE.test(line.trim()))) return false;
	try {
		editorBlock.replaceCode(code);
	} catch (failure) {
		console.error("[widgetarium] the editor refused the board, so the file is written instead", failure);
		return false;
	}
	return blockHolds(editorBlock.section(), code);
}

export function readBody(text: string): string {
	const lines = text.split("\n");
	return lines.slice(bodyStart(lines)).join("\n");
}

export function replaceBody(text: string, body: unknown): string | null {
	const lines = text.split("\n");
	const start = bodyStart(lines);
	const next = [...lines.slice(0, start), ...String(body ?? "").split("\n")].join("\n");

	const nextLines = next.split("\n");
	if (bodyStart(nextLines) !== start) return null;
	if (nextLines.slice(0, start).join("\n") !== lines.slice(0, start).join("\n")) return null;
	return next;
}

function scanFences(lines: readonly string[]): FenceScan {
	const blocks: BlockLines[] = [];
	let start = -1;
	lines.forEach((raw, index) => {
		const line = raw.trim();
		if (start < 0 && FENCE_OPEN.test(line)) start = index;
		else if (start >= 0 && FENCE_CLOSE.test(line)) {
			blocks.push({ start, end: index });
			start = -1;
		}
	});
	return { blocks, unclosed: start };
}

function bodyStart(lines: readonly string[]): number {
	if (!FRONTMATTER_FENCE.test(lines[0] ?? "")) return 0;
	const closing = lines.findIndex((line, index) => index > 0 && FRONTMATTER_FENCE.test(line));
	return closing > 0 ? closing + 1 : 0;
}

function blockHolds(section: BlockSection | null | undefined, code: string): boolean {
	if (!section) return false;
	const lines = section.text.split("\n");
	const block = findBlocks(lines).find((found) => found.start === section.lineStart);
	return block !== undefined && lines.slice(block.start + 1, block.end).join("\n") === code;
}
