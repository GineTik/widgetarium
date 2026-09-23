import { access, copyFile, mkdir, readFile, realpath, stat } from "node:fs/promises";

process.chdir(import.meta.dirname);

// TRADE-OFF: a path in the source, because one machine builds this and the vault it installs into never moves — WG_VAULT overrides it on any other
const VAULT = process.env.WG_VAULT ?? `${process.env.HOME}/Documents/Obsidian/Personal/Personal`;
const target = `${VAULT}/.obsidian/plugins/widgetarium`;
const VAULT_MISSING = "there is no vault at {at} — set WG_VAULT to the folder Obsidian opens, or move the vault there";
const BUILD_OUTPUTS = ["main.js", "manifest.json", "styles.css"];
const SETTINGS_FILE = "data.json";

const here = await realpath(".");
const targetIsThisRepo = await realpath(target).then(
	(at) => at === here,
	() => false,
);

async function describeBuild() {
	const bytes = (await stat("main.js")).size;
	const carriesSourcemap = (await readFile("main.js", "utf8")).includes("//# sourceMappingURL=");
	return `${(bytes / 1048576).toFixed(2)} MB, ${carriesSourcemap ? "dev build with an inline sourcemap" : "production build"}`;
}

const exists = (at) =>
	access(at).then(
		() => true,
		() => false,
	);

// TRADE-OFF: seeded only into a folder that has none, so the copy in the repo can never overwrite live settings
async function seedSettings() {
	if (!(await exists(SETTINGS_FILE)) || (await exists(`${target}/${SETTINGS_FILE}`))) return;
	await copyFile(SETTINGS_FILE, `${target}/${SETTINGS_FILE}`);
	console.log(`carried ${SETTINGS_FILE} across`);
}

if (targetIsThisRepo) {
	console.log(`the plugin folder is a symlink to apps/obsidian — nothing to copy`);
	console.log(`Obsidian is running main.js from here: ${await describeBuild()}`);
	console.log(
		`a dev build costs the vault every start; "npm run install-vault" replaces the symlink with a production copy`,
	);
} else if (!(await exists(VAULT))) {
	console.error(VAULT_MISSING.replace("{at}", VAULT));
	process.exit(1);
} else {
	await mkdir(target, { recursive: true });
	for (const file of BUILD_OUTPUTS) await copyFile(file, `${target}/${file}`);
	await seedSettings();
	console.log(`installed to ${target}: ${await describeBuild()}`);
}
