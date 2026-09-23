import { ALLOWED_LICENSES, DICEBEAR_API, DICEBEAR_STYLES, OPTION_NAME } from "../constants/dicebear";

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
