export type ShapePick = Readonly<Record<string, unknown>>;

export type Shapes = Record<string, ShapePick>;

export interface ShapeStorage {
	readonly read: () => Readonly<Shapes>;
	readonly write: (shapes: Shapes) => void;
}

export interface ShapeStore {
	readonly readShape: (path: string) => ShapePick;
	readonly follow: (was: string, now: string) => void;
}

export function shapesOf(stored: unknown): Shapes {
	const held = isHeld(stored) ? stored : {};
	const shapes: Shapes = {};
	for (const [path, chosen] of Object.entries(held)) {
		if (isHeld(chosen)) shapes[path] = { ...chosen };
	}
	return shapes;
}

export function renameShapes(shapes: Readonly<Shapes>, was: string, now: string): Shapes {
	const moved: Shapes = {};
	for (const [path, chosen] of Object.entries(shapes)) moved[movePath(path, was, now)] = chosen;
	return moved;
}

// TODO: the writer that records a person's pick returns with the Reading block, which is its only reader
export function createShapeStore({ read, write }: ShapeStorage): ShapeStore {
	return {
		readShape: (path) => read()[path] ?? {},
		follow: (was, now) => followRename(read(), write, was, now),
	};
}

const isHeld = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

function movePath(path: string, was: string, now: string): string {
	if (path === was) return now;
	return path.startsWith(`${was}/`) ? `${now}${path.slice(was.length)}` : path;
}

function followRename(shapes: Readonly<Shapes>, write: ShapeStorage["write"], was: string, now: string): void {
	const moved = renameShapes(shapes, was, now);
	if (JSON.stringify(moved) !== JSON.stringify(shapes)) write(moved);
}
