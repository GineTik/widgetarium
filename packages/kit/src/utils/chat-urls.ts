const MEDIA_TYPE = /^[a-z]+\/[a-z0-9.+-]+$/i;

const DRAWN_DATA_TYPE = /^image\/(png|jpeg|gif|webp|avif)$|^(audio|video)\/[a-z0-9.+-]+$|^application\/pdf$/i;

const BASE64 = /^[a-z0-9+/=\s]*$/i;

const DATA_SCHEME = "data:";

const LINK_SCHEMES: ReadonlySet<string> = new Set(["http:", "https:"]);

export function mediaTypeOf(value: string | null): string | null {
	const bare = value?.split(";")[0]?.trim() ?? "";
	return MEDIA_TYPE.test(bare) ? bare : null;
}

export function linkUrlOf(url: string | null): string | null {
	const scheme = schemeOf(url);
	return scheme !== null && LINK_SCHEMES.has(scheme) ? url : null;
}

export function fileUrlOf(url: string | null): string | null {
	if (url === null) return null;
	if (schemeOf(url) !== DATA_SCHEME) return linkUrlOf(url);
	return isDrawnDataUrl(url) ? url : null;
}

export function dataUrlOf(mediaType: string | null, base64: string): string | null {
	if (mediaType === null || !DRAWN_DATA_TYPE.test(mediaType) || !BASE64.test(base64)) return null;
	return `data:${mediaType};base64,${base64}`;
}

function isDrawnDataUrl(url: string): boolean {
	const comma = url.indexOf(",");
	const header = url.slice(DATA_SCHEME.length, comma);
	const [mediaType = "", encoding] = header.split(";");
	return comma > 0 && encoding?.toLowerCase() === "base64" && dataUrlOf(mediaType, url.slice(comma + 1)) !== null;
}

function schemeOf(url: string | null): string | null {
	if (url === null) return null;
	if (url.slice(0, DATA_SCHEME.length).toLowerCase() === DATA_SCHEME) return DATA_SCHEME;
	return URL.canParse(url) ? new URL(url).protocol : null;
}
