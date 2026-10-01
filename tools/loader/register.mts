import { registerHooks } from "node:module";
import { load, resolve } from "./hooks.mts";

registerHooks({ resolve, load });
