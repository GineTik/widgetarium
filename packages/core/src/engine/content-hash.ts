const MULTIPLIER_KEEPING_STEPS_UNDER_2_POW_53 = 131;
const MODULUS_KEEPING_STEPS_UNDER_2_POW_53 = 1000000007;

export function contentHash(text: string | null | undefined): string {
	let hash = 0;
	const source = String(text ?? "");
	for (let at = 0; at < source.length; at += 1)
		hash =
			(hash * MULTIPLIER_KEEPING_STEPS_UNDER_2_POW_53 + source.charCodeAt(at)) % MODULUS_KEEPING_STEPS_UNDER_2_POW_53;
	return String(hash);
}
