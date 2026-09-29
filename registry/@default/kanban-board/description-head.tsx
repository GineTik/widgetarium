import { Segmented } from "widgetarium/kit";
import { DETAIL, PREVIEW } from "./description-modes";
import { Glyph } from "./glyph";

export function DescriptionHead({
	offered,
	mode,
	onChange,
}: {
	offered: string[];
	mode: string;
	onChange: (next: string) => void;
}) {
	return (
		<div className="otd-desc-head">
			<span className="otd-cap">Description</span>
			{offered.length > 1 ? (
				<Segmented
					items={[
						{ value: PREVIEW, label: [<Glyph key="glyph" name="eye" />, "Preview"] },
						{ value: DETAIL, label: [<Glyph key="glyph" name="brackets" />, "Detail"] },
					]}
					size="s"
					value={mode}
					onChange={onChange}
				/>
			) : null}
		</div>
	);
}
