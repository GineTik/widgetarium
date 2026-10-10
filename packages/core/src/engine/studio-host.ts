export interface HostApp {
	readonly id: string;
	readonly name: string;
	readonly pages: number;
	readonly firstPage: string | null;
	readonly refusal?: string;
}

export interface ChromeInsets {
	readonly left: number;
	readonly right: number;
}

export interface StudioHostPort {
	insets(): ChromeInsets;
	onInsets(changed: () => void): () => void;
	apps(): Promise<readonly HostApp[]>;
	openApp(id: string): Promise<void>;
	createApp(): Promise<void>;
}

export const NOT_AVAILABLE_ON_HOST = "not available on this host";

export const NO_INSETS: ChromeInsets = { left: 0, right: 0 };

export const NO_STUDIO_HOST: StudioHostPort = {
	insets: () => NO_INSETS,
	onInsets: () => () => undefined,
	apps: () => Promise.reject(new Error(NOT_AVAILABLE_ON_HOST)),
	openApp: () => Promise.reject(new Error(NOT_AVAILABLE_ON_HOST)),
	createApp: () => Promise.reject(new Error(NOT_AVAILABLE_ON_HOST)),
};
