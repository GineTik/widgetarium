import type { Drawn, Entry, Rows } from "./types";
import { useRowSource } from "./use-row-source";

export function RowInSlot({ Drawn, rows, row, givenAs }: { Drawn: Drawn; rows: Rows; row: Entry; givenAs: string }) {
	return <Drawn {...{ [givenAs]: useRowSource(rows, row) }} />;
}
