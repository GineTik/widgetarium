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
