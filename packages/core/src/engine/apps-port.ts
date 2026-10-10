export interface HostApp {
	readonly id: string;
	readonly name: string;
	readonly pages: number;
	readonly firstPage: string | null;
}

export interface AppsPort {
	readonly can: boolean;
	list(): Promise<readonly HostApp[]>;
	open(id: string): Promise<void>;
	create(): Promise<void>;
	editInCanvas(id: string): Promise<void>;
	backToView(id: string): Promise<void>;
	toggleAssistant(): Promise<void>;
	subscribe(changed: () => void): () => void;
}

const NO_APPS_MESSAGE = "no apps on this host";

export const NO_APPS_PORT: AppsPort = {
	can: false,
	list: async () => [],
	open: () => Promise.reject(new Error(NO_APPS_MESSAGE)),
	create: () => Promise.reject(new Error(NO_APPS_MESSAGE)),
	editInCanvas: () => Promise.reject(new Error(NO_APPS_MESSAGE)),
	backToView: () => Promise.reject(new Error(NO_APPS_MESSAGE)),
	toggleAssistant: () => Promise.reject(new Error(NO_APPS_MESSAGE)),
	subscribe: () => () => undefined,
};
