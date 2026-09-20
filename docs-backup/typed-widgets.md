# A widget's manifest is a value in its own code

`DECISION` · 2026-09-17

## TL;DR

A widget declares itself with `defineManifest` in `widget.tsx`, and its props are runtime values made
by builders, so the engine reads `kind`, verbs and defaults from the code it already runs. Types are
inferred from those values, never the other way round, and `manifest.generated.json` is only the card
a catalogue reads before it has run anything.

## Why not types first

The previous decision read props off TypeScript types at publish. A vault whose scope is a symlink to
the repository never publishes, so the engine saw a `label` prop with no `kind`, took it for a
collection, and every tab of every board drew empty. Types are erased by every transpiler, so a fact
that exists only in a type does not exist at runtime. Zod, Sanity and Framer's property controls settle
the same tension the same way: the schema is a value, and the type is `infer`red from it.

## The shape

```tsx
export const manifest = defineManifest({
	title: "Editable tabs",
	description: "A row of tabs you can rename, add to and archive.",
	role: "control",
	size: { collapseBelowPx: 90, stackBelowPx: 220, tallestPx: 42 },
	props: {
		tabs: defineProp<Tab[]>()({ label: "Tabs", default: [], writes: ["create", "update", "remove"] }),
		label: defineProp<string>()({ label: "Label field", default: "name" }),
		selection: defineProp<string>()({
			label: "Selected tab",
			of: "tabs",
			fieldFrom: "value",
			fallback: "first",
			writes: ["update"],
		}),
	},
	migrate: [
		migration({
			from: { heading: defineProp<string>()({ label: "Heading", default: "" }) },
			run: (old) => ({ label: old.heading }),
		}),
	],
});

export default createWidget(manifest, ({ tabs, label, selection }) => {});
```

- `defineProp<Held>()` is curried because a type argument written by hand switches off inference for
  the rest of the call, and `writes` has to stay a literal for the gateway type to narrow to it.
- An array type makes a collection, anything else a value. Nothing else says which is which.
- `writes` is an array of standard verbs or a record holding `verb<Input, Output>()` for a verb of the
  widget's own; the gateway offers exactly those plus the reads, which are never declared.
- `PropsOf<typeof manifest>` is what the component receives; an inline widget is also handed
  `content` and `reader`.
- The manifest carries no id, version or api. The folder is the id, the commit is the version, and
  the build stamps the api into the card.

## Where each fact lives

| Fact                                   | Owner                                                           |
| -------------------------------------- | --------------------------------------------------------------- |
| a prop's kind, control, verbs, default | `defineProp`, read out by `specOf` in `src/gateway/manifest.ts` |
| the manifest the engine reads          | `manifestOf` in `src/engine/catalogue-index.js`                 |
| the card a catalogue reads             | `cardOf`, written by `npm run manifest`                         |
| which verbs a tile may run             | `allowedVerbs` over the binding's `allow`                       |
| whether an update breaks tiles         | `compatibility` in `src/engine/compatibility.js`                |

## Refused on purpose

- A default naming a vault path. A widget reaches a person's notes only through a binding the person
  made.
- A prop with no default, other than a pick or a row.
- Parsing `defineManifest` out of the source instead of running it: a literal-only manifest would
  forbid the builders that make it typed.
