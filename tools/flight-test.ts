import { flightBetween } from "../packages/widgetarium/src/studio/canvas/flight.ts";

let failed = 0;
function check(what: string, ok: boolean, got: unknown): void {
	if (!ok) failed += 1;
	console.log(`${ok ? "OK  " : "!!  "}${what}${ok ? "" : `  got ${JSON.stringify(got)}`}`);
}

const view = { width: 1600, height: 1000 };
const from = { x: 0, y: 0, scale: 0.15 };
const to = { x: -3000, y: -1200, scale: 0.8 };
const far = flightBetween(from, to, view);
const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;
const start = far.lookAt(0);
const end = far.lookAt(1);
check(
	"a flight starts exactly where the canvas stands",
	near(start.x, from.x) && near(start.y, from.y) && near(start.scale, from.scale),
	start,
);
check(
	"and lands exactly on the look it was given",
	near(end.x, to.x) && near(end.y, to.y) && near(end.scale, to.scale),
	end,
);
const across = flightBetween({ x: 0, y: 0, scale: 0.8 }, { x: -6000, y: 0, scale: 0.8 }, view);
check(
	"a long trip at one zoom rises in the middle: it zooms out, travels, zooms back in",
	across.lookAt(0.5).scale < 0.8 * 0.6,
	across.lookAt(0.5),
);
const steps = Array.from({ length: 11 }, (_, at) => far.lookAt(at / 10).scale);
check("every step of a flight is a finite look", steps.every(Number.isFinite), steps);
check("a flight is never instant and never drags", far.ms >= 450 && far.ms <= 1300, far.ms);
const stay = flightBetween(from, from, view);
check(
	"a flight to where the canvas already stands is still a valid look",
	near(stay.lookAt(0.5).scale, from.scale),
	stay.lookAt(0.5),
);

console.log(`\n${failed === 0 ? "flight: clean" : `flight: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
