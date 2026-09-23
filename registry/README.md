# Widget registry

The widget library everyone installs from. Each widget is a folder: `widget.tsx`, an optional `widget.css`, and a `manifest.generated.json` card the catalogue reads without running the code.

| Scope      | Widgets | What for                                                         |
| ---------- | ------- | ---------------------------------------------------------------- |
| `@default` | 31      | The everyday set: lists, tables, boards, metrics, tabs, calendar |
| `@flow`    | 15      | A work-in-flight dashboard: commits, files, QA, reports          |
| `@media`   | 5       | Albums, tracks and a player                                      |

`widgetarium-registry.json` names what the registry offers.

A widget installed into a project is a copy pinned to the commit it came from; it changes only when its owner updates it. To change a library widget for one project, fork it into your own scope rather than editing the copy.

Cards are written, never authored: `npm run manifest` rebuilds every `manifest.generated.json` from the code.

## Licence

[MIT](LICENSE): copy these widgets into any project, including a commercial one.
