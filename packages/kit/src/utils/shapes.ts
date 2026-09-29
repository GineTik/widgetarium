export function shapesOf(stored) {
	const held = isHeld(stored) ? stored : {};
	const shapes = {};
	for (const [path, chosen] of Object.entries(held)) {
		if (isHeld(chosen)) shapes[path] = { ...chosen };
	}
	return shapes;
}

export function renameShapes(shapes, was, now) {
	const moved = {};
	for (const [path, chosen] of Object.entries(shapes)) moved[movePath(path, was, now)] = chosen;
	return moved;
}

// TODO: the writer that records a person's pick returns with the Reading block, which is its only reader
export function createShapeStore({ read, write }) {
	return {
		readShape: (path) => read()[path] ?? {},
		follow: (was, now) => followRename(read(), write, was, now),
	};
}

const isHeld = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

function movePath(path, was, now) {
	if (path === was) return now;
	return path.startsWith(`${was}/`) ? `${now}${path.slice(was.length)}` : path;
}

function followRename(shapes, write, was, now) {
	const moved = renameShapes(shapes, was, now);
	if (JSON.stringify(moved) !== JSON.stringify(shapes)) write(moved);
}
