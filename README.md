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

Файл `.widgetarium/widgets/<scope>/<name>/widget.js` виконується з доступними `h`, `useState`, `useEffect`, `useMemo`, `useRef` і мусить визначити `const widget = ({ settings, data, host, size, fullscreen }) => …`.

Поруч — `manifest.json` з `id`, `minSize`, `data` (слоти) і `settings` (схема форми).

Повний опис — нотатка `Widgetarium Demo/Довідка.md` у сховищі.

## Стан

Реалізовано: сітка з точок, drag і resize зі збереженням, палітра віджетів, налаштування плитки з маніфесту, повний екран, слоти даних над теками (`list/get/create/update/remove/subscribe/describe`), `can`-поля, два віджети.

Не реалізовано: порти й дроти між віджетами, компоненти-екрани, кодген типів, каталог і оновлення.
