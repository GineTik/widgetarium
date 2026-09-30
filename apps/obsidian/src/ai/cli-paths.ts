import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

export const VAULT = resolve(HERE, "..", "..");
export const WIDGETS_DIR = join(VAULT, ".widgetarium", "widgets");
export const INDEX_PATH = join(VAULT, ".widgetarium", "catalogue.json");
export const PLUGIN_DATA = join(VAULT, ".obsidian", "plugins", "widgetarium", "data.json");
