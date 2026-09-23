import { buildMirror } from "./mirror.mjs";

buildMirror();

const { defineManifest, defineProp } = await import("./.mjs-cache/gateway/manifest.mjs");

function refusalFor(name, prop) {
	try {
		defineManifest({ size: { preferredWidth: "full", preferredHeight: "auto" },  title: "Probe", description: "A probe.", role: "detail", props: { [name]: prop } });
		return "accepted";
	} catch (failure) {
		return String(failure.message);
	}
}

const CASES = [
	["a plain object default carrying path", defineProp()({ default: { path: "Tasks/one.md", added: 3 } })],
	["an array default whose rows carry path", defineProp()({ default: [{ path: "Tasks/one.md", added: 3 }] })],
	["a plain object default carrying filePath", defineProp()({ default: { filePath: "Tasks/one.md", added: 3 } })],
	["a nested object default carrying path", defineProp()({ default: { change: { path: "Tasks/one.md" } } })],
	["a plain object default carrying ref", defineProp()({ default: { ref: "abc", title: "One" } })],
	["an array default whose rows carry ref", defineProp()({ default: [{ ref: "abc", title: "One" }] })],
];

for (const [what, prop] of CASES) {
	const said = refusalFor("probe", prop);
	const refused = said !== "accepted";
	console.log(`${refused ? "refused " : "ACCEPTED"}  ${what}`);
	if (refused) console.log(`          ${said.split("\n").pop()}`);
}

console.log("");
