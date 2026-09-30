export const HOST_TYPES = ["obsidian-desktop", "obsidian-mobile", "obsidian-web"] as const;

export type HostType = (typeof HOST_TYPES)[number];

export interface HostPlatformFlags {
	readonly isMobileApp?: unknown;
	readonly isMobile?: unknown;
	readonly isDesktopApp?: unknown;
}

export function hostTypeOf(platform: HostPlatformFlags | null | undefined): HostType {
	if (platform?.isMobileApp || platform?.isMobile) return "obsidian-mobile";
	if (platform?.isDesktopApp) return "obsidian-desktop";
	return "obsidian-web";
}
