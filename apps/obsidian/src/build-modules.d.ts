declare module "widgetarium:surface" {
	export const REACT_SURFACE_SOURCE: string | null;
}

declare module "widgetarium:widgets-cli" {
	export const packedHash: string;
	export default function unpack(): Promise<string>;
}

declare module "widgetarium:widget-types" {
	export const packedHash: string;
	export default function unpack(): Promise<Readonly<Record<string, string>>>;
}

declare module "widgetarium:catalogue-widgets" {
	const files: Readonly<Record<string, string>>;
	export default files;
}

declare module "widgetarium:build-stamp" {
	export const BUILD_STAMP: string;
}
