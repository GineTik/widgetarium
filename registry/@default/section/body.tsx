import { useData, type PropsOf, type MountEntry, type Slot } from "widgetarium";
import { Layout, type LayoutKind } from "widgetarium/kit";
import { PER_ROW } from "./body-modes";
import { PerRow } from "./per-row";
import { Placed } from "./placed";
import type SectionWidget from "./widget";

type BodyProps = {
	filling: string;
	getItems: PropsOf<typeof SectionWidget>["getItems"];
	pageSize: number;
	Drawn: Slot<Record<string, unknown>> | undefined;
	placed: readonly MountEntry[];
	kind: LayoutKind;
	narrowest: number;
};

export function Body({ filling, getItems, pageSize, Drawn, placed, kind, narrowest }: BodyProps) {
	const rows = useData(getItems, { limit: pageSize }).data;
	return (
		<Layout kind={kind} min={narrowest}>
			{filling === PER_ROW ? <PerRow Drawn={Drawn} rows={rows} /> : <Placed held={placed} />}
		</Layout>
	);
}
