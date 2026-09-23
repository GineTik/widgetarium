# Widgetarium

Плитки-віджети на сітці з точок для Obsidian. Віджети живуть у сховищі, плагін їх лише рендерить.

## Розробка

```bash
npm run build          # зібрати main.js
npm run install-vault  # зібрати й покласти у сховище
WG_VAULT="/шлях/до/vault" npm run install-vault
```

Після заміни файлів у сховищі — у Obsidian: Settings → Community plugins → вимкнути й увімкнути Widgetarium.
Після зміни коду віджетів — команда `Widgetarium: Перезавантажити віджети`.

## Структура

```
src/
  main.js       точка входу: код-блок, екран, ribbon, команди
  surface.js    сітка, drag, resize, налаштування плитки, повний екран
  registry.js   завантаження віджетів із .widgetarium/widgets
  host.js       реалізація host для Obsidian: слоти даних, can-поля
  paths.js      константи сітки й шляхів
```

## Контракт віджета

Файл `.widgetarium/widgets/<scope>/<name>/widget.js` виконується з доступними `h`, `useState`, `useEffect`, `useMemo`, `useRef` і може імпортувати `react`, `react-dom`, `widgetarium`, `widgetarium/kit` і мусить визначити `const widget = ({ settings, data, host, size, fullscreen }) => …`.

Поруч — `manifest.json` з `id`, `minSize`, `data` (слоти) і `settings` (схема форми).

Повний опис — нотатка `Widgetarium Demo/Довідка.md` у сховищі.

## Стан

Реалізовано: сітка з точок, drag і resize зі збереженням, палітра віджетів, налаштування плитки з маніфесту, повний екран, слоти даних над теками (`list/get/create/update/remove/subscribe/describe`), `can`-поля, два віджети.

Не реалізовано: порти й дроти між віджетами, компоненти-екрани, кодген типів, каталог і оновлення.

## License

Two licences, one per folder. [LICENSE](LICENSE) is the map.

| Folder           | Licence                               |
| ---------------- | ------------------------------------- |
| `packages/kit/`  | [MIT](packages/kit/LICENSE)           |
| `registry/`      | [MIT](registry/LICENSE)               |
| `packages/core/` | [FSL-1.1-ALv2](packages/core/LICENSE) |
| `packages/sdk/`  | [FSL-1.1-ALv2](packages/sdk/LICENSE)  |
| `apps/obsidian/` | [FSL-1.1-ALv2](apps/obsidian/LICENSE) |

The kit and the widgets are MIT so they can be copied into any project, including a commercial one. The FSL folders may be used, changed and shared for any purpose except a Competing Use: offering them, or something substantially similar built from them, as a commercial product or service. Each version becomes Apache 2.0 two years after its release. To build a competing product, contact the author for a commercial license.
