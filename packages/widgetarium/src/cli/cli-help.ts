export const CLI_HELP = `widgetarium <command>

  create <dir> [--name <app>] [--engine <folder>] [--no-git] [--no-install]
      a new app in an empty folder: Vite, React, TypeScript, Tailwind, zod and the kit copied in;
      --engine names the folder holding the engine tarballs (inside the repo it is packed for you)

  check [dir]
      reads widgetarium.json and checks every layer: duplicate names, refused widgets, unreadable
      boards; exits 1 on findings

  catalogue    coming in S8
  add          coming in S8`;

export const RESERVED_COMMANDS: readonly string[] = ["catalogue", "add"];
export const HELP_WORDS: readonly string[] = ["help", "--help", "-h"];
