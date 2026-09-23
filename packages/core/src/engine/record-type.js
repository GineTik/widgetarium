// CONTEXT: what KIND of thing a record is, so a filter can ask for pictures and not for names.
// Derived from the path, never authored — an extension and a written property would disagree.
const BY_EXTENSION = {
	md: "markdown",
	canvas: "canvas",
	pdf: "pdf",
	png: "image",
	jpg: "image",
	jpeg: "image",
	gif: "image",
	webp: "image",
	svg: "image",
	bmp: "image",
	avif: "image",
	mp4: "video",
	webm: "video",
	mov: "video",
	mkv: "video",
	mp3: "audio",
	wav: "audio",
	ogg: "audio",
	m4a: "audio",
	flac: "audio",
};

export function typeOf(path) {
	const name = String(path ?? "").toLowerCase();
	const dot = name.lastIndexOf(".");
	if (dot < 0) return "folder";
	if (name.endsWith(".excalidraw.md")) return "excalidraw";
	const extension = name.slice(dot + 1);
	return BY_EXTENSION[extension] ?? extension;
}
