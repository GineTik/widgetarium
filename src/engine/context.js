// What THIS viewer is looking at: which board, which view, which task is open, what was
// typed in the search box. It is LOCAL and it goes nowhere — not to the file, not to another
// viewer. Two people on one board scroll, filter and open tasks independently, which is the
// only way a shared board is usable at all.
//
// A widget that wants to say something to everyone writes it to a STORE — a source, through
// actions — and every viewer reads it back from there. Local looking, shared facts: the line
// between them is the line between this module and an adapter.
//
// One writer per key. A widget declares `provides` in its manifest to write and `consumes`
// to read, and the two never meet: neither knows the other exists.
//
// CONTEXT: the writer is one INSTANCE — keyed by widget id, a second tile overwrote the first in silence

export function createContext(initial = {}) {
	let values = { ...initial };
	const listeners = new Set();
	const owners = new Map();

	function set(key, value, owner) {
		const held = owners.get(key);
		if (held && held !== owner) {
			console.warn(`Widgetarium: "${key}" is written by ${held}; ${owner} may not also write it`);
			return false;
		}
		owners.set(key, owner);
		if (values[key] === value) return true;

		values = { ...values, [key]: value };
		for (const listener of listeners) listener(values);
		return true;
	}

	return {
		get: (key) => values[key],
		all: () => values,
		set,
		// A key stays claimed until its widget lets go. Without this the claim outlives the
		// widget: delete the tabs from the board and nothing could ever write "board" again.
		release(owner) {
			for (const [key, held] of owners) {
				if (held === owner) owners.delete(key);
			}
		},
		providerOf: (key) => owners.get(key) ?? null,
		// every key somebody on this board offers — the list the binding dropdown shows
		offered: () => [...owners.keys()],
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}
