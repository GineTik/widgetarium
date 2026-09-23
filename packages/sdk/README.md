# @widgetarium/sdk

The types a widget is written against. A widget imports `widgetarium`; these declarations are what that name means to TypeScript, so an editor checks a widget's props, its data and the verbs it may call.

| File                     | What it declares                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------- |
| `types/widgetarium.d.ts` | `defineManifest`, `defineProp`, `createWidget`, `useData`, the gateways and rows      |
| `types/globals.d.ts`     | `widgetarium/kit`, `widgetarium/kit/emojis` and the other modules a widget may import |
| `tsconfig.widgets.json`  | The compiler settings every widget is held to                                         |

The declarations re-export the gateway types from [`@widgetarium/core`](../core), so the manifest a widget declares is typed by the same code the engine runs.

## Where it is used

- [`registry/tsconfig.json`](../../registry/tsconfig.json) points `widgetarium` here, so every shipped widget is typed in an editor.
- The plugin lays these types into a vault as `.widgetarium/widgets/types/` beside the widgets, so a widget written in a vault is typed too.
- `npm run test:needs` compiles every widget against them.

## Licence

[FSL-1.1-ALv2](LICENSE).
