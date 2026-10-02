import { registerPacks } from "../packages/core/src/engine/packs.ts";
import { corePack } from "../packages/packs/core/src/index.ts";
import { gitPack } from "../packages/packs/git/src/index.ts";
import { obsidianPack } from "../packages/packs/obsidian/src/index.ts";
import { statsPack } from "../packages/packs/stats/src/index.ts";

registerPacks(corePack, obsidianPack, statsPack, gitPack);
