export const CLI_HELP = `widgetarium <command>

  create <dir> [--name <app>] [--engine <folder>] [--no-git] [--no-install]
      a new app in an empty folder: Vite, React, TypeScript, Tailwind, zod and the kit copied in;
      --engine names the folder holding the engine tarballs (inside the repo it is packed for you)

  check [dir]
      reads widgetarium.json and checks every layer: duplicate names, refused widgets, unreadable
      boards; exits 1 on findings

  catalogue list | search <words> | show <id> [--registry <folder or URL>] [--json]
      the widgets the registries offer: widgetarium.json's catalogue.registries, or this repo's
      registry/ when run inside it; show prints a card: props, commands, files, libs, dependencies

  add <id> [--as <name>] [--registry <folder or URL>]
      copies a catalogue widget into the project's widgets folder, its scope's libs into libs with
      the imports rewritten to the alias, its npm dependencies into package.json, and origin.json
      beside it; never over a widget of the same name`;

export const HELP_WORDS: readonly string[] = ["help", "--help", "-h"];
