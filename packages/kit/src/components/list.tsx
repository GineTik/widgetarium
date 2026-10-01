import { createElement as h } from "react";
import type { CSSProperties, FunctionComponent, Key, ReactNode } from "react";
import { listClass, rowClass } from "../utils/class-names";
import { cn } from "../utils/cn";
import { createSlotPart } from "./slot";
import type { SlotPartProps } from "./create-slot-part";

export type SlotDrawing<Given = Readonly<Record<string, unknown>>> = ((given: Given) => ReactNode) & {
	readonly isCard?: boolean;
};

interface SlotListFrame<Given> {
	readonly slot?: SlotDrawing<Given> | null | undefined;
	readonly className?: string | undefined;
	readonly style?: CSSProperties | undefined;
}

interface SlotListOfChildren {
	readonly children: ReactNode;
}

interface SlotListOfRows<R, Given> {
	readonly rows?: readonly R[] | undefined;
	readonly give: (row: R) => Given;
	readonly keyOf?: ((row: R) => Key) | undefined;
}

export type SlotListProps<R, Given> = SlotListFrame<Given> & (SlotListOfChildren | SlotListOfRows<R, Given>);

export const List: FunctionComponent<SlotPartProps> = createSlotPart("div", listClass, "List");

export const Row: FunctionComponent<SlotPartProps & { readonly pressable?: boolean | undefined }> = createSlotPart(
	"div",
	rowClass,
	"Row",
);

export const RowBadge: FunctionComponent<SlotPartProps> = createSlotPart(
	"span",
	(props) => cn("wg-kit-row-badge", props.className),
	"RowBadge",
);

export const RowLabel: FunctionComponent<SlotPartProps> = createSlotPart(
	"span",
	(props) => cn("wg-kit-row-label", props.className),
	"RowLabel",
);

export const RowValue: FunctionComponent<SlotPartProps> = createSlotPart(
	"span",
	(props) => cn("wg-kit-row-value", props.className),
	"RowValue",
);

export function SlotList<R, Given extends object>(props: SlotListProps<R, Given>): ReactNode {
	const { slot: Drawn, className: cls, style } = props;
	if (!Drawn) return null;
	return (
		<div className={cn("wg-kit-slot-list", cls)} style={style} data-cards={Drawn.isCard ? "" : undefined}>
			{"give" in props ? drawnRows(Drawn, props) : props.children}
		</div>
	);
}

function drawnRows<R, Given extends object>(
	Drawn: SlotDrawing<Given>,
	{ rows = [], give, keyOf }: SlotListOfRows<R, Given>,
): ReactNode {
	return rows.map((row, at) => <Drawn key={keyOf ? keyOf(row) : at} {...give(row)} />);
}
