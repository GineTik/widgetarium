import { fieldOf } from "widgetarium";
import { toTabList, type Board } from "@default/lib";

export function propertiesOf(board: Board | null | undefined): string[] {
	return toTabList(fieldOf(board, "properties"));
}
