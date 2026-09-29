import { Button, ButtonLabel } from "widgetarium/kit";
import { PLUS } from "./numbers";
import { Stroked } from "./stroked";
import type { Band } from "./types";

export function AddButton({ band, onAdd }: { band: Band; onAdd: () => void }) {
	const saysItself = band === "wide" || band === "mid";
	return (
		<Button
			variant="accent"
			size="s"
			className="mt3-add"
			data-part="add"
			aria-label={saysItself ? undefined : "Add record"}
			onClick={onAdd}
		>
			<Stroked part="add-icon" className="mt3-add-icon" size={17} weight={2}>
				<path d={PLUS} />
			</Stroked>
			{saysItself ? <ButtonLabel>Add record</ButtonLabel> : null}
		</Button>
	);
}
