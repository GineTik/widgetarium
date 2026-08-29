const FENCE_OPEN = /^```+\s*widgetarium\s*$/;
const FENCE_CLOSE = /^```+\s*$/;

export function findBlocks(lines) {
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
	return blocks;
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
