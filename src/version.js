export const BLOCK_FORMAT = 1;
export const WIDGET_API = 1;
export const MIN_WIDGET_API = 1;

const OLDEST_BLOCK_FORMAT = 1;
const WIDGET_API_WHEN_ABSENT = 1;

function versionNumber(declared, whenAbsent) {
	if (declared === undefined || declared === null) return whenAbsent;
	return Number.isInteger(declared) && declared >= 0 ? declared : null;
}

export function blockFormatOf(input) {
	return versionNumber(input?.v, OLDEST_BLOCK_FORMAT);
}

// TRADE-OFF: a newer block is refused, never migrated down — a rewrite would destroy what it cannot read
export function blockRefusal(input) {
	const format = blockFormatOf(input);
	if (format === null) return `Widgetarium: this board declares format "${input?.v}", which is not a version number.`;
	if (format < OLDEST_BLOCK_FORMAT) return `Widgetarium: this board declares format ${format}, and board formats start at ${OLDEST_BLOCK_FORMAT}.`;
	if (format > BLOCK_FORMAT) return `Widgetarium: this board was written in format ${format}, and this plugin reads up to ${BLOCK_FORMAT}. Update Widgetarium to open it — nothing was changed.`;
	return null;
}

export function widgetApiOf(manifest) {
	return versionNumber(manifest?.api, WIDGET_API_WHEN_ABSENT);
}

export function apiRefusal(manifest) {
	const id = manifest?.id ?? "This widget";
	const api = widgetApiOf(manifest);
	if (api === null) return `${id} declares widget API "${manifest?.api}", which is not a version number.`;
	if (api > WIDGET_API) return `${id} needs widget API ${api}, and this Widgetarium provides ${WIDGET_API}.`;
	if (api < MIN_WIDGET_API) return `${id} was built for widget API ${api}, and this Widgetarium no longer runs anything below ${MIN_WIDGET_API}.`;
	return null;
}
