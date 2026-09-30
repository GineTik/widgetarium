export const BLOCK_FORMAT = 2;
export const WIDGET_API = 2;
export const MIN_WIDGET_API = 1;
export const REGISTRY_FORMAT = 1;

const OLDEST_BLOCK_FORMAT = 1;
const WIDGET_API_WHEN_ABSENT = 1;
const OLDEST_REGISTRY_FORMAT = 1;

interface VersionedBlock {
	readonly v?: unknown;
}

interface VersionedRegistry {
	readonly registry?: unknown;
}

export interface VersionedManifest {
	readonly id?: string;
	readonly api?: unknown;
}

type Held<Shape> = Shape | null | undefined;

export function blockFormatOf(input: Held<VersionedBlock>): number | null {
	return versionNumber(input?.v, OLDEST_BLOCK_FORMAT);
}

// TRADE-OFF: a newer block is refused, never migrated down — a rewrite would destroy what it cannot read
export function blockRefusal(input: Held<VersionedBlock>): string | null {
	const format = blockFormatOf(input);
	if (format === null)
		return `Widgetarium: this board declares format "${String(input?.v)}", which is not a version number.`;
	if (format < OLDEST_BLOCK_FORMAT)
		return `Widgetarium: this board declares format ${format}, and board formats start at ${OLDEST_BLOCK_FORMAT}.`;
	if (format > BLOCK_FORMAT)
		return `Widgetarium: this board was written in format ${format}, and this plugin reads up to ${BLOCK_FORMAT}. Update Widgetarium to open it — nothing was changed.`;
	return null;
}

// TRADE-OFF: a newer registry is refused whole rather than read row by row — a row this plugin cannot
// TRADE-OFF: read may be the one saying which files a widget is, and installing half of that is worse
export function registryRefusal(raw: Held<VersionedRegistry>, at: string): string | null {
	const format = registryFormatOf(raw);
	if (format === null)
		return `${at} declares registry format "${String(raw?.registry)}", which is not a version number.`;
	if (format < OLDEST_REGISTRY_FORMAT)
		return `${at} declares registry format ${format}, and registry formats start at ${OLDEST_REGISTRY_FORMAT}.`;
	if (format > REGISTRY_FORMAT)
		return `${at} is written in registry format ${format}, and this Widgetarium reads up to ${REGISTRY_FORMAT}. Update Widgetarium to install from it.`;
	return null;
}

export function widgetApiOf(manifest: Held<VersionedManifest>): number | null {
	return versionNumber(manifest?.api, WIDGET_API_WHEN_ABSENT);
}

export function apiRefusal(manifest: Held<VersionedManifest>): string | null {
	const id = manifest?.id ?? "This widget";
	const api = widgetApiOf(manifest);
	if (api === null) return `${id} declares widget API "${String(manifest?.api)}", which is not a version number.`;
	if (api > WIDGET_API) return `${id} needs widget API ${api}, and this Widgetarium provides ${WIDGET_API}.`;
	if (api < MIN_WIDGET_API)
		return `${id} was built for widget API ${api}, and this Widgetarium no longer runs anything below ${MIN_WIDGET_API}.`;
	return null;
}

function versionNumber(declared: unknown, whenAbsent: number): number | null {
	if (declared === undefined || declared === null) return whenAbsent;
	return typeof declared === "number" && Number.isInteger(declared) && declared >= 0 ? declared : null;
}

function registryFormatOf(raw: Held<VersionedRegistry>): number | null {
	return versionNumber(raw?.registry, OLDEST_REGISTRY_FORMAT);
}
