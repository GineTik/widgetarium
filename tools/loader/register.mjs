import { registerHooks } from "node:module";
import { setFlagsFromString } from "node:v8";
import { load, resolve } from "./hooks.mjs";

// TRADE-OFF: Node 25's exit deadlocks on a background Sparkplug job awaiting GC; compile it on the main thread
setFlagsFromString("--no-concurrent-sparkplug");
registerHooks({ resolve, load });
