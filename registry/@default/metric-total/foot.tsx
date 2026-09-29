import { IconButton } from "widgetarium/kit";
import { AddButton } from "./add-button";
import { ListGlyph } from "./list-glyph";
import type { Band } from "./types";

type FootProps = { band: Band; canAdd: boolean; onAdd: () => void; onList: () => void };

export function Foot({ band, canAdd, onAdd, onList }: FootProps) {
	return (
		<div data-part="foot" className="mt3-foot">
			{canAdd ? <AddButton band={band} onAdd={onAdd} /> : null}
			<IconButton className="mt3-open-list" data-part="open-list" label="All records" onClick={onList}>
				<ListGlyph part="open-list-icon" className="mt3-list-icon" />
			</IconButton>
		</div>
	);
}
