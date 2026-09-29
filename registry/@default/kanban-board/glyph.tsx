import { GLYPHS } from "./glyphs";

export function Glyph({ name, className }: { name: string; className?: string }) {
	return (
		<svg
			className={`otd-glyph${className ? ` ${className}` : ""}`}
			viewBox="0 0 16 16"
			aria-hidden="true"
			dangerouslySetInnerHTML={{ __html: GLYPHS[name] ?? "" }}
		/>
	);
}
