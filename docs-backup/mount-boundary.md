# The mount boundary

A widget held inside another widget arrives as a React node today: `MountEntry.render()` returns an
element the holder puts in its own tree. That makes the seam between two widgets the narrowest thing
there is — two React instances cannot share a tree, and one instance cannot run a hook compiled
against another.

This moves the seam to a DOM element.

It does not by itself let a widget bring its own React. Four locks stand between here and that; this
is one. The other three are the tile boundary, the hooks in the public surface (`useData`, `useValue`,
`useNarrowed`, `useAction` in `src/api.js`), and the import allowlist in `createRequire`.

What it does give on its own: a nested widget's crash stops killing its holder. Today the tile's
`Boundary` catches it and the whole tab group reads "Widget crashed".

Slots are out of scope. A slot draws per row and is fed by its parent, so it needs a session per row —
a separate step.

## The contract

`MountEntry` is what an author of a widget with `mounts` in its manifest sees. Declared in
`widgets/types/widgetarium.d.ts`.

```ts
export type Release = () => void;

export interface MountEntry {
	name: string;
	id: string;
	hidden: boolean;
	title: string;
	manifest: Record<string, unknown> | null;
	problem: "failed" | "not-found" | "empty" | null;
	failure: string | null;
	drawInto: ((element: HTMLElement) => Release) | null;
}
```

`render: (() => ReactNode) | null` is gone. Nothing else changes.

`drawInto` is **idempotent**: a second call for the same element redraws the child with fresh props
rather than remounting it. That is what keeps the child's state when the holder re-renders.

Whether there is anything to draw has ONE answer — `problem`. The holder branches on it; `drawInto`
is only ever called. `drawInto !== null` and `problem === null` say the same thing by construction,
and two records of one conclusion drift on the first change.

A React holder takes the component from `widgetarium`. The `key` is required and is what makes a tab
change a real unmount rather than one root reconciled into another:

```tsx
<Mounted key={entry.name} entry={entry} />
```

A holder written in anything else calls `drawInto` / `Release` directly.

## How

`leaseFor(node)` in `src/engine/render.js` already owns a node's React root and already gives back
`draw` / `release`. `drawInto` opens a lease on the element it is handed; `Release` closes it.

`Mounted` needs two effects because there are two lives: a redraw on every holder render, and a
release exactly once.

```js
export function Mounted({ entry }) {
	const node = useRef(null);
	const release = useRef(null);

	useEffect(() => {
		release.current = entry.drawInto?.(node.current);
	});
	useEffect(() => () => release.current?.(), []);

	if (!entry.drawInto) {
		console.error(
			`Widgetarium: Mounted was given "${entry.name}", which has nothing to draw — branch on entry.problem first`,
		);
		return h("div", { className: "wg-missing" }, h("b", null, "This view cannot be drawn"));
	}
	return h("div", { className: "wg-mounted", ref: node });
}
```

A holder author's mistake is not thrown: a throw here lands in the holder's own `Boundary`, which is
exactly the crash this change exists to stop.

The child's tree is wrapped in its own `Boundary` inside its own root, because a DOM seam does not
carry an error upwards.

## Decided, with the reason

**`drawInto`, not `mount` and not `draw`.** `mount` already means three things here
(`manifest.mounts`, `MountedWidget`, `resolveMounts`) and bare `draw` is a fourth — `src/portal.js`
hands out a `draw` that takes a tree, not an element.

**`.wg-mounted { display: contents }`, unscoped.** The class is ours and has one owner. Scoping it
under `.wg-root`/`.wg-portal` would miss the inline renderer and the settings window.

**The overlay rule names the root that CONTAINS the overlay**, rather than weakening its chain of
direct descendants:

```css
.wg-widget-root:has([data-wg-overlay]) {
	overflow: visible;
}
```

Weakening `.wg-tile:has([data-wg-overlay]) > .wg-tile-body > .wg-widget-root` to a descendant chain
would un-clip every nested `.wg-widget-root` in the tile — every card in a kanban among them — which
is against what that rule exists for: the grid decides the size, never the content.

**No `api:` bump.** `docs/versioning.md` puts a field's removal under `MIN_WIDGET_API`, "the
expensive one", which would refuse all 15 manifests since every one carries `"api": 1`. Exactly one
declares `mounts`, and it moves in the same commit.

## The traps, each one measured

**A redraw arrives a macrotask later, not a microtask.** `leaseFor().draw` goes through
`root.render`, which React schedules on its own scheduler. `await Promise.resolve()` will not flush
it. The jsdom suites over `view-group` — `test:interact`, `test:settings`, `test:template`,
`test:strip` — have to wait for a real task. `test:view` is headless Chrome with a virtual time
budget and is not affected.

**`TreeRegion` seeds `restingRef` in a `useLayoutEffect` while `.wg-mounted` is still empty.** The
child lands a tick later in its own root, so nothing re-seeds, and the next holder render diffs a
collapsed row against a grown one and animates a phantom slide of everything below.

**The child's gateways register in `refs` a tick later than the holder's.** A reader gets `null` for
one pass, which is harmless. `pickedWrites` is not: it gates a WRITE on `list().total > 0`, so during
that pass a write can go to the tile instead of the row.

**A holder render redraws the child, and cannot bail out of it.** `mountEntry` mints a fresh
`drawInto` per call and `Mounted` redraws on every holder render, because the child's props come out
of the holder's `mount` object and a stale child is worse than a redraw. Inside one tree React could
skip the pass on reference equality; across the seam it cannot, so `memo` on a mounted child no
longer saves anything.

**A cached read the holder's redraw used to refresh is not refreshed by the child's own.**
`refs.put` runs in the child's render and its `notify` is a microtask; the child's `useData`
subscription is a passive effect a task later, so the invalidation that reached it inside the
holder's `flushSync` pass now arrives before it is listening. `gatewayCache` served the entry it
still held, and the kanban archived a column onto the board it was last drawn for. Measured on
`test:interact`, six checks. The owner is the cache: an entry nobody was subscribed to is not known
to be current, and is re-read when a watcher returns.

**No risk from React context across the seam.** `AppearanceOverride` is the only provider of
`Override` and no widget imports it; `useWidgetRounded` and `useBackgroundType` have no widget caller.

## What has to be true afterwards

Each of these must be breakable on purpose. A check that cannot be broken proves nothing.

| Claim                                                                              | Break it by                                                                        |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| a child that throws leaves the holder and its tab strip standing                   | putting the child back in the holder's tree — the tile's `Boundary` eats the group |
| the child's state survives an ordinary holder re-render                            | making `drawInto` mint a new element per call                                      |
| changing tab calls `Release`                                                       | dropping the `key` on `Mounted`                                                    |
| an overlay inside a mounted child is not clipped, while sibling cards stay clipped | restoring the direct-descendant chain, then weakening it to descendants            |
| the child's gateways reach `refs`                                                  | removing `refs.put` from the child's path                                          |
