import type { Row } from "widgetarium";
import { Button, Count, SlotList } from "widgetarium/kit";
import { Cell } from "./cell";
import { CSS } from "./style";
import type { Drawn, Project } from "./types";

type CellsProps = {
	Drawn: Drawn;
	rows: Row<Project>[];
	picked: string;
	onPick: (ref: string) => void;
	rest: number;
	onMore: () => void;
};

const MORE = "Show more";

export function Cells({ Drawn, rows, picked, onPick, rest, onMore }: CellsProps) {
	return (
		<div className="flow-project-grid">
			<style>{CSS}</style>
			<SlotList slot={Drawn} className="flow-project-grid-cells">
				{rows.map((row) => (
					<Cell key={row.ref} Drawn={Drawn} project={row} isPicked={isPicked(row, picked)} onPick={onPick} />
				))}
			</SlotList>
			{rest > 0 ? (
				<Button className="flow-project-grid-more" onClick={onMore}>
					{MORE}
					<Count>{rest}</Count>
				</Button>
			) : null}
		</div>
	);
}

function isPicked(row: Row<Project>, picked: string) {
	return picked !== "" && String(row.name ?? "") === picked;
}
