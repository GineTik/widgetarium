import { ALLOWED_LICENSES, DICEBEAR_API, DICEBEAR_STYLES, OPTION_NAME } from "../constants/dicebear";

export type DiceBearVerdict =
	{ readonly refusal: string; readonly credit?: undefined } | { readonly refusal?: undefined; readonly credit: string };

export type DiceBearOptions = Readonly<Record<string, unknown>>;

export function diceBearVerdict(style: unknown): DiceBearVerdict {
	const named = String(style);
	const held = Object.hasOwn(DICEBEAR_STYLES, named) ? DICEBEAR_STYLES[named] : undefined;
	if (!held) return { refusal: `${named} is no DiceBear style` };
	const { license, author } = held;
	if (!ALLOWED_LICENSES.includes(license))
		return { refusal: `${named} by ${author} is licensed "${license}", which is not on the allow list` };
	return { credit: `${named} by ${author}, ${license}` };
}

export function diceBearUrl(style: string, seed: unknown, options: DiceBearOptions = {}): string {
	const query = new URLSearchParams({ seed: String(seed ?? "") });
	for (const [name, value] of Object.entries(options)) {
		if (!OPTION_NAME.test(name)) continue;
		query.set(name, Array.isArray(value) ? value.join(",") : String(value));
	}
	return `${DICEBEAR_API}/${style}/svg?${query.toString()}`;
}
