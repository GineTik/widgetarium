import { VaultRecord } from "widgetarium";
import { EMOJI_PREFIX, heldValues, ICON_PREFIX } from "@default/lib";
import { Cell } from "./cell";
import type { Drawn, Shown } from "./types";

type RowProps = { row: VaultRecord; columns: Shown[]; titleProperty: string; isYesNo: boolean };

export function Row({ row, columns, titleProperty, isYesNo }: RowProps) {
	const held = heldValues(row);
	return (
		<>
			{titleProperty === "" ? null : (
				<div className="wg-tbl-title">
					<Cell drawn={drawnOf(held[titleProperty], isYesNo)} />
				</div>
			)}
			{columns.map((column) => (
				<div className="wg-tbl-cell" key={column.property}>
					<Cell drawn={drawnOf(held[column.property], isYesNo)} />
				</div>
			))}
		</>
	);
}

function drawnOf(value: unknown, isYesNo: boolean): Drawn {
	if (value === null || value === undefined) return { kind: "blank" };
	if (typeof value === "boolean") return { kind: "text", text: saidBoolean(value, isYesNo) };
	if (Array.isArray(value)) return drawnFromText(value.map((part) => saidPart(part, isYesNo)).join(", "));
	if (typeof value === "object") return drawnFromText(JSON.stringify(value));
	return drawnFromText(String(value));
}

function saidPart(value: unknown, isYesNo: boolean): string {
	if (typeof value === "boolean") return saidBoolean(value, isYesNo);
	if (value === null || value === undefined) return "";
	return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function saidBoolean(value: boolean, isYesNo: boolean): string {
	if (isYesNo) return value ? "Yes" : "No";
	return value ? "true" : "false";
}

function drawnFromText(written: string): Drawn {
	const text = written.trim();
	if (text === "") return { kind: "blank" };
	if (text.startsWith(EMOJI_PREFIX)) return namedDrawing("emoji", text.slice(EMOJI_PREFIX.length));
	if (text.startsWith(ICON_PREFIX)) return namedDrawing("icon", text.slice(ICON_PREFIX.length));
	return { kind: "text", text };
}

function namedDrawing(kind: "emoji" | "icon", rest: string): Drawn {
	const written = rest.trim();
	const at = written.indexOf(" ");
	if (at === -1) return { kind, name: written, text: "" };
	return { kind, name: written.slice(0, at), text: written.slice(at + 1).trim() };
}
