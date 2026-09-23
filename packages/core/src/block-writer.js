export const FENCE = "```";
export const BLOCK_LANGUAGE = "widgetarium";

const FENCE_OPEN = new RegExp(`^${FENCE}+\\s*${BLOCK_LANGUAGE}\\s*$`);
const FENCE_CLOSE = new RegExp(`^${FENCE}+\\s*$`);

function scanFences(lines) {
	const blocks = [];
	let start = -1;
	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index].trim();
		if (start < 0 && FENCE_OPEN.test(line)) start = index;
		else if (start >= 0 && FENCE_CLOSE.test(line)) {
			blocks.push({ start, end: index });
			start = -1;
		}
	}
	return { blocks, unclosed: start };
}

export function findBlocks(lines) {
	return scanFences(lines).blocks;
}

export function unclosedBlockIn(lines) {
	return scanFences(lines).unclosed;
}

export function replaceBlock(text, blockIndex, body, isValidBlock) {
	const lines = text.split("\n");
	const blocks = findBlocks(lines);
	const block = blocks[blockIndex];
	if (!block || block.end <= block.start) return null;

	const bodyLines = body.trimEnd().split("\n");
	lines.splice(block.start + 1, block.end - block.start - 1, ...bodyLines);
	const next = lines.join("\n");

	const nextLines = next.split("\n");
	const nextBlocks = findBlocks(nextLines);
	if (nextBlocks.length !== blocks.length) return null;

	const written = nextLines.slice(nextBlocks[blockIndex].start + 1, nextBlocks[blockIndex].end).join("\n");
	if (isValidBlock && !isValidBlock(written)) return null;
	return next;
}

// TRADE-OFF: replaceCode is Obsidian's unpublished method Bases writes through; the file write stays as the fallback
export function writeInEditor(editorBlock, body) {
	if (typeof editorBlock?.replaceCode !== "function") return false;
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

const FRONTMATTER_FENCE = /^---\s*$/;

// CONTEXT: frontmatter only when the FIRST line opens it; an unclosed fence is body
function bodyStart(lines) {
	if (!FRONTMATTER_FENCE.test(lines[0] ?? "")) return 0;
	for (let index = 1; index < lines.length; index += 1) {
		if (FRONTMATTER_FENCE.test(lines[index])) return index + 1;
	}
	return 0;
}

export function readBody(text) {
	const lines = text.split("\n");
	return lines.slice(bodyStart(lines)).join("\n");
}

// CONTEXT: refuse rather than half-write — a body opening with a rule would become frontmatter
export function replaceBody(text, body) {
	const lines = text.split("\n");
	const start = bodyStart(lines);
	const next = [...lines.slice(0, start), ...String(body ?? "").split("\n")].join("\n");

	const nextLines = next.split("\n");
	if (bodyStart(nextLines) !== start) return null;
	if (nextLines.slice(0, start).join("\n") !== lines.slice(0, start).join("\n")) return null;
	return next;
}

function blockHolds(section, code) {
	if (!section) return false;
	const lines = section.text.split("\n");
	const block = findBlocks(lines).find((found) => found.start === section.lineStart);
	return block !== undefined && lines.slice(block.start + 1, block.end).join("\n") === code;
}
