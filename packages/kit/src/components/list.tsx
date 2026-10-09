import { createElement as h } from "react";
import type { CSSProperties, FunctionComponent, Key, ReactNode } from "react";
import { listClass, ROW_PART } from "../utils/class-names";
import { cn } from "../utils/cn";
import { classedSlotPart } from "./create-slot-part";
import type { SlotPartProps } from "./create-slot-part";
import { createSlotPart } from "./slot";

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

export { Row } from "./row";
export type { RowProps } from "./row";

export const RowBadge: FunctionComponent<SlotPartProps> = classedSlotPart("span", ROW_PART.badge, "RowBadge");

export const RowLabel: FunctionComponent<SlotPartProps> = classedSlotPart("span", ROW_PART.label, "RowLabel");

export const RowText: FunctionComponent<SlotPartProps> = classedSlotPart("span", ROW_PART.text, "RowText");

export const RowSupporting: FunctionComponent<SlotPartProps> = classedSlotPart(
	"span",
	ROW_PART.supporting,
	"RowSupporting",
);

export const RowValue: FunctionComponent<SlotPartProps> = classedSlotPart("span", ROW_PART.value, "RowValue");

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
