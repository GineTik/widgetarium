import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";

const HASH_HEX_LENGTH = 16;
const IS_TEXT = '(held) => typeof held === "string"';
const IS_FILES =
	'(held) => typeof held === "object" && held !== null && Object.values(held).every((text) => typeof text === "string")';

const UNPACK_SOURCE = [
	"let pendingUnpack = null;",
	"export default function unpack() {",
	'\tpendingUnpack ??= new Response(new Blob([Uint8Array.from(atob(PACKED_BASE64), (char) => char.charCodeAt(0))]).stream().pipeThrough(new DecompressionStream("gzip"))).text().then((text) => {',
	"\t\tconst unpacked = JSON.parse(text);",
	'\t\tif (!isUnpackedShape(unpacked)) throw new Error("the packed module does not hold the shape it was packed with");',
	"\t\treturn unpacked;",
	"\t});",
	"\treturn pendingUnpack;",
	"}",
	"",
].join("\n");

export function packedModuleSource(value: string | Readonly<Record<string, string>>): string {
	const json = JSON.stringify(value);
	const packedBase64 = gzipSync(json, { level: 9 }).toString("base64");
	const hash = createHash("sha256").update(json).digest("hex").slice(0, HASH_HEX_LENGTH);
	const isUnpackedShape = typeof value === "string" ? IS_TEXT : IS_FILES;
	return [
		`const PACKED_BASE64 = ${JSON.stringify(packedBase64)};`,
		`export const packedHash = ${JSON.stringify(hash)};`,
		`const isUnpackedShape = ${isUnpackedShape};`,
		UNPACK_SOURCE,
	].join("\n");
}
