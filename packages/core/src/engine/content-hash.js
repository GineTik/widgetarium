// CONTEXT: a doubling hash overflows the double mantissa and silently returns a WRONG number,
// so the multiplier and the modulus are chosen to keep every step under 2^53
const PRIME = 131;
const MODULUS = 1000000007;

export function contentHash(text) {
	let hash = 0;
	const source = String(text ?? "");
	for (let at = 0; at < source.length; at += 1) hash = (hash * PRIME + source.charCodeAt(at)) % MODULUS;
	return String(hash);
}
