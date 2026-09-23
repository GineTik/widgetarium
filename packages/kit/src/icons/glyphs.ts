import { ICON_TABLE, ICON_VIEW_BOX } from "./icon-table";

export const GLYPHS = {
	chevron: '<path d="M8.25 5.5l4.5 4.5-4.5 4.5"/>',
	fold: '<path d="M11.75 5.5l-4.5 4.5 4.5 4.5"/>',
	expand: '<path d="M11.8 4.6h3.6v3.6"/><path d="M8.2 15.4H4.6v-3.6"/><path d="M15.4 4.6l-4.4 4.4M4.6 15.4l4.4-4.4"/>',
	collapse: '<path d="M15 9.2h-3.6V5.6"/><path d="M5 10.8h3.6v3.6"/><path d="M11.4 9.2l4-4M8.6 10.8l-4 4"/>',
	search: '<circle cx="9.25" cy="9.25" r="4.75"/><path d="M12.9 12.9l3.35 3.35"/>',
	filter: '<path d="M3.6 5.4h12.8l-4.9 5.7v4.5l-3-1.7v-2.8z"/>',
	curve: '<path d="M3.6 13.2l3.5-4.3 3 2.6 3.2-4.6 3.1 3"/>',
	bars: '<path d="M5 14.4V9.8M10 14.4V5.6M15 14.4v-2.9"/>',
	plus: '<path d="M10 4.9v10.2M4.9 10h10.2"/>',
	"arrow-up": '<path d="M10 15.4V5.5M5.7 9.8L10 5.5l4.3 4.3"/>',
	download: '<path d="M10 4.6v7.6M6.4 8.8L10 12.4l3.6-3.6"/><path d="M4.9 15.4h10.2"/>',
	update: '<path d="M15.6 9.4a5.7 5.7 0 10-1.6 3.8"/><path d="M15.6 5v4.4h-4.4"/>',
	retry: '<path d="M4.4 10.6a5.7 5.7 0 111.6 3.8"/><path d="M4.4 15v-4.4h4.4"/>',
	clock: '<circle cx="10" cy="10" r="5.6"/><path d="M10 6.6V10l2.2 1.3"/>',
	chat: '<path d="M3.7 4.5h12.6v8.3H7.3l-3.6 2.7z"/>',
	folder: '<path d="M3.7 5.3h3.8l1.3 1.9h7.5v7.5H3.7z"/>',
	check: '<rect x="4.2" y="4.2" width="11.6" height="11.6" rx="3.4"/><path d="M7.3 10.1l2 2 3.5-4"/>',
	tick: '<path d="M5 10.4l3.3 3.3 6.7-7.1"/>',
	pencil: '<path d="M4.6 15.4l1-3.7 7.4-7.4 2.7 2.7-7.4 7.4z"/>',
	// CONTEXT: r below half the 1.8 stroke, or the stroke leaves a hole and the dots read as rings
	dots: '<circle cx="10" cy="5.2" r="0.8"/><circle cx="10" cy="10" r="0.8"/><circle cx="10" cy="14.8" r="0.8"/>',
	menu: '<path d="M4.6 6.3h10.8M4.6 10h10.8M4.6 13.7h10.8"/>',
	terminal:
		'<rect x="3.6" y="4.4" width="12.8" height="11.2" rx="2.6"/><path d="M6.6 8.4l2.2 2.1-2.2 2.1M10.6 12.8h3"/>',
	gear: '<circle cx="10" cy="10" r="2.5"/><path d="M10 3.6v1.5M10 14.9v1.5M16.4 10h-1.5M5.1 10H3.6M14.53 5.47l-1.06 1.06M6.53 13.47l-1.06 1.06M14.53 14.53l-1.06-1.06M6.53 6.53L5.47 5.47"/>',
	stop: '<rect x="6" y="6" width="8" height="8" rx="2.2"/>',
	sparkle: '<path d="M10 3.8l1.6 3.9 3.9 1.6-3.9 1.6-1.6 3.9-1.6-3.9L4.5 9.3l3.9-1.6z"/>',
	archive:
		'<rect x="3.8" y="4.3" width="12.4" height="3.6" rx="1.4"/><path d="M5.1 7.9v6.4a1.4 1.4 0 001.4 1.4h7a1.4 1.4 0 001.4-1.4V7.9"/><path d="M8.5 11.1h3"/>',
	close: '<path d="M6.4 6.4l7.2 7.2M13.6 6.4l-7.2 7.2"/>',
	widget: '<rect x="4" y="4" width="12" height="12" rx="3.4"/><path d="M7.4 8.2h5.2M7.4 11.6h3.2"/>',
	"sidebar-left": '<rect x="3.4" y="4.2" width="13.2" height="11.6" rx="3.2"/><path d="M8.2 4.2v11.6"/>',
	"sidebar-right": '<rect x="3.4" y="4.2" width="13.2" height="11.6" rx="3.2"/><path d="M11.8 4.2v11.6"/>',
	copy: '<rect x="7.4" y="7.4" width="8.4" height="8.4" rx="2.4"/><path d="M12.6 4.2H6.6a2.4 2.4 0 00-2.4 2.4v6"/>',
	"open-tab":
		'<path d="M9 4.6H6.4a1.8 1.8 0 00-1.8 1.8v7.2a1.8 1.8 0 001.8 1.8h7.2a1.8 1.8 0 001.8-1.8V11"/><path d="M11.8 4.6h3.6v3.6M15.4 4.6L9.6 10.4"/>',
	link: '<path d="M8.5 11.5a2.8 2.8 0 000 4l.5.5a2.8 2.8 0 004 0l2.5-2.5a2.8 2.8 0 000-4l-.5-.5"/><path d="M11.5 8.5a2.8 2.8 0 000-4L11 4a2.8 2.8 0 00-4 0L4.5 6.5a2.8 2.8 0 000 4l.5.5"/>',
};

const KIT_VIEW_BOX = "0 0 20 20";

export function iconOf(name) {
	if (Object.hasOwn(GLYPHS, name)) return { body: GLYPHS[name], viewBox: KIT_VIEW_BOX, isLucide: false };
	if (Object.hasOwn(ICON_TABLE, name)) return { body: ICON_TABLE[name], viewBox: ICON_VIEW_BOX, isLucide: true };
	return null;
}
