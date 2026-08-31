// WHICH BUILD a widget is running in, not which family. The family says whose host it is; this
// says what that host can actually reach — a desktop build has a command line behind it, a phone
// does not, and a browser tab has neither.
export const HOST_TYPES = ["obsidian-desktop", "obsidian-mobile", "obsidian-web"];

export function hostTypeOf(platform) {
	if (platform?.isMobileApp || platform?.isMobile) return "obsidian-mobile";
	if (platform?.isDesktopApp) return "obsidian-desktop";
	return "obsidian-web";
}
