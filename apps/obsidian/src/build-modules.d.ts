declare module "widgetarium:surface" {
	export const REACT_SURFACE_SOURCE: string | null;
}

declare module "widgetarium:widgets-cli" {
	const bundled: string;
	export default bundled;
}

declare module "widgetarium:widget-types" {
	const files: Readonly<Record<string, string>>;
	export default files;
}
