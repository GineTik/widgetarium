const NO_SLOT = "This report has no widget to draw its figures with.";

export function NoFigureSlot() {
	return <p className="flow-report-said">{NO_SLOT}</p>;
}
