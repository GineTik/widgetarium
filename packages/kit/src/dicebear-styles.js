export const DICEBEAR_API = "https://api.dicebear.com/10.x";

export const ALLOWED_LICENSES = ["CC0 1.0", "MIT", "CC BY 4.0"];

const CC0 = "CC0 1.0";
const CC_BY = "CC BY 4.0";
const PERSONAL_AND_COMMERCIAL = "Free for personal and commercial use";

export const DICEBEAR_STYLES = {
	blobs: { license: CC0, author: "DiceBear", suits: "abstract" },
	cameo: { license: CC0, author: "DiceBear", suits: "person" },
	clay: { license: CC0, author: "DiceBear", suits: "person" },
	constellation: { license: CC0, author: "DiceBear", suits: "abstract" },
	critters: { license: CC0, author: "DiceBear", suits: "character" },
	cutouts: { license: CC0, author: "DiceBear", suits: "abstract" },
	disco: { license: CC0, author: "DiceBear", suits: "abstract" },
	gaze: { license: CC0, author: "DiceBear", suits: "character" },
	glass: { license: CC0, author: "DiceBear", suits: "abstract" },
	identicon: { license: CC0, author: "DiceBear", suits: "abstract" },
	"initial-face": { license: CC0, author: "DiceBear", suits: "character" },
	initials: { license: CC0, author: "DiceBear", suits: "organisation" },
	landscape: { license: CC0, author: "DiceBear", suits: "place" },
	"line-face": { license: CC0, author: "DiceBear", suits: "character" },
	loops: { license: CC0, author: "DiceBear", suits: "abstract" },
	"lorelei-neutral": { license: CC0, author: "Lisa Wischofsky", suits: "person" },
	lorelei: { license: CC0, author: "Lisa Wischofsky", suits: "person" },
	marbles: { license: CC0, author: "DiceBear", suits: "abstract" },
	moods: { license: CC0, author: "DiceBear", suits: "character" },
	"notionists-neutral": { license: CC0, author: "Zoish", suits: "person" },
	notionists: { license: CC0, author: "Zoish", suits: "person" },
	"open-peeps": { license: CC0, author: "Pablo Stanley", suits: "person" },
	patchwork: { license: CC0, author: "DiceBear", suits: "abstract" },
	"pixel-art-neutral": { license: CC0, author: "DiceBear", suits: "person" },
	"pixel-art": { license: CC0, author: "DiceBear", suits: "person" },
	pixelbot: { license: CC0, author: "DiceBear", suits: "character" },
	planets: { license: CC0, author: "DiceBear", suits: "abstract" },
	rings: { license: CC0, author: "DiceBear", suits: "abstract" },
	shadows: { license: CC0, author: "DiceBear", suits: "abstract" },
	"shape-grid": { license: CC0, author: "DiceBear", suits: "abstract" },
	shapes: { license: CC0, author: "DiceBear", suits: "abstract" },
	slice: { license: CC0, author: "DiceBear", suits: "abstract" },
	sprouts: { license: CC0, author: "DiceBear", suits: "abstract" },
	squircles: { license: CC0, author: "DiceBear", suits: "abstract" },
	stack: { license: CC0, author: "DiceBear", suits: "abstract" },
	stripes: { license: CC0, author: "DiceBear", suits: "abstract" },
	thumbs: { license: CC0, author: "DiceBear", suits: "character" },
	triangles: { license: CC0, author: "DiceBear", suits: "abstract" },
	"voxel-art": { license: CC0, author: "DiceBear", suits: "person" },
	"voxel-bot": { license: CC0, author: "DiceBear", suits: "character" },
	waves: { license: CC0, author: "DiceBear", suits: "abstract" },
	weave: { license: CC0, author: "DiceBear", suits: "abstract" },
	"adventurer-neutral": { license: CC_BY, author: "Lisa Wischofsky", suits: "person" },
	adventurer: { license: CC_BY, author: "Lisa Wischofsky", suits: "person" },
	"big-ears-neutral": { license: CC_BY, author: "The Visual Team", suits: "person" },
	"big-ears": { license: CC_BY, author: "The Visual Team", suits: "person" },
	"big-smile": { license: CC_BY, author: "Ashley Seo", suits: "person" },
	"croodles-neutral": { license: CC_BY, author: "vijay verma", suits: "person" },
	croodles: { license: CC_BY, author: "vijay verma", suits: "person" },
	dylan: { license: CC_BY, author: "Natalia Spivak", suits: "person" },
	"fun-emoji": { license: CC_BY, author: "Davis Uche", suits: "character" },
	glyphs: { license: CC_BY, author: "Matt Houser", suits: "abstract" },
	micah: { license: CC_BY, author: "Micah Lanier", suits: "person" },
	miniavs: { license: CC_BY, author: "Webpixels", suits: "person" },
	personas: { license: CC_BY, author: "Draftbit", suits: "person" },
	"toon-head": { license: CC_BY, author: "Johan Melin", suits: "person" },
	icons: { license: "MIT", author: "The Bootstrap Authors", suits: "organisation" },
	"avataaars-neutral": { license: PERSONAL_AND_COMMERCIAL, author: "Pablo Stanley", suits: "person" },
	avataaars: { license: PERSONAL_AND_COMMERCIAL, author: "Pablo Stanley", suits: "person" },
	"bottts-neutral": { license: PERSONAL_AND_COMMERCIAL, author: "Pablo Stanley", suits: "character" },
	bottts: { license: PERSONAL_AND_COMMERCIAL, author: "Pablo Stanley", suits: "character" },
};

const OPTION_NAME = /^[A-Za-z][A-Za-z0-9]*$/;

export function diceBearVerdict(style) {
	if (!Object.hasOwn(DICEBEAR_STYLES, style)) return { refusal: `${style} is no DiceBear style` };
	const { license, author } = DICEBEAR_STYLES[style];
	if (!ALLOWED_LICENSES.includes(license))
		return { refusal: `${style} by ${author} is licensed "${license}", which is not on the allow list` };
	return { credit: `${style} by ${author}, ${license}` };
}

export function diceBearUrl(style, seed, options = {}) {
	const query = new URLSearchParams({ seed: String(seed ?? "") });
	for (const [name, value] of Object.entries(options)) {
		if (!OPTION_NAME.test(name)) continue;
		query.set(name, Array.isArray(value) ? value.join(",") : String(value));
	}
	return `${DICEBEAR_API}/${style}/svg?${query}`;
}
