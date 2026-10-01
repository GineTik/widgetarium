# @widgetarium/sdk

The types a widget is written against. A widget imports `widgetarium`; these declarations are what that name means to TypeScript, so an editor checks a widget's props, its data and the verbs it may call.

| File                     | What it declares                                                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `types/widgetarium.d.ts` | Re-exports of what the engine hands a widget: `createWidget`, the `define*` builders, the gateway classes, `useData`, the dialogs |
| `tsconfig.widgets.json`  | The compiler settings every widget is held to, and where `widgetarium/kit`, `/emojis` and `/charts` resolve to                    |

Nothing here is written twice: every name comes from its declaration in [`@widgetarium/core`](../core) or [`@widgetarium/kit`](../kit), read through project references, so the props a widget declares are typed by the same code the engine runs. `npm run test:surface` holds the re-exports to the engine's runtime surface.

## Where it is used

- [`registry/tsconfig.json`](../../registry/tsconfig.json) points `widgetarium` here, so every shipped widget is typed in an editor.
- The plugin lays these types into a vault as `.widgetarium/widgets/types/` beside the widgets, with the core and kit declarations they reach and React's types, so a widget written in a vault is typed too (`tools/widget-types.mts`).
- `npm run test:needs` compiles every widget against them.

## Licence

[FSL-1.1-ALv2](LICENSE).
