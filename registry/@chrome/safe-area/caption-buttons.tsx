import { Icon } from "widgetarium/kit";

const CAPTION_GLYPHS = ["minus", "square", "x"] as const;

export function CaptionButtons({ isDrawn }: { readonly isDrawn: boolean }) {
	return (
		<span className="flex h-11 w-[138px] shrink-0 items-stretch" data-name="Windows caption buttons" aria-hidden="true">
			{isDrawn
				? CAPTION_GLYPHS.map((glyph) => (
						<span key={glyph} className="flex flex-1 items-center justify-center text-muted-foreground">
							<Icon name={glyph} size={14} />
						</span>
					))
				: null}
		</span>
	);
}
