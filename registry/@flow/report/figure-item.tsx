import type { Row } from "widgetarium";
import type { Figure, FigureSlot, FiguresGateway } from "./types";
import { useFigureSource } from "./use-figure-source";

type Drawn = NonNullable<FigureSlot>;

export function FigureItem({ figures, row, Drawn: Draw }: { figures: FiguresGateway; row: Row<Figure>; Drawn: Drawn }) {
	return <Draw source={useFigureSource(figures, row)} />;
}
