// THE SCROLLBAR LOOP. A wider board makes taller content, taller content brings the note's
// scrollbar in, the scrollbar takes the width back, and the narrower board is a column short
// — which makes it taller still. Measured live at 1256 and 1224, alternating forever, with a
// file write on each turn.
//
// A fixed slack cannot answer this: the swing is as wide as the loop happens to be, and 32px
// is a legitimate resize as easily as it is a scrollbar. What identifies the loop is not its
// size but its SHAPE — a width we just left, coming straight back, within a frame or two. A
// person dragging a window edge returns slowly and keeps moving; this returns at once and
// stays.
const SCROLLBAR_SLACK_PX = 20;
const OSCILLATION_MS = 500;

// A WIDTH THAT IS STILL MOVING IS NOT A WIDTH YET.
//
// Obsidian's side panel slides open, and the note goes 1115 → 1013 → 973 → 902 → 827 in one
// gesture. Treating each frame as a new screen re-laid the whole board five times per toggle:
// the app lagged, and a tile near its chip threshold crossed it and came back within a few
// milliseconds, which is the flicker. So the board waits for the number to stop changing.
//
// Short enough that dragging a window edge still feels live — the layout keeps up at roughly
// eight updates a second — and long enough to collapse an animation into one.
const SETTLE_MS = 120;

export function createWidthGate({ minimum, now = () => Date.now() } = {}) {
	let accepted = 0;
	let left = 0;
	let leftAt = 0;

	return (value) => {
		if (!(value >= minimum)) return false;
		if (accepted && Math.abs(value - accepted) <= SCROLLBAR_SLACK_PX) return false;

		const at = now();
		if (left && Math.abs(value - left) <= SCROLLBAR_SLACK_PX && at - leftAt < OSCILLATION_MS) return false;

		left = accepted;
		leftAt = at;
		accepted = value;
		return true;
	};
}

// The measuring side: every frame goes in, and only a settled width comes out.
export function createWidthWatcher({ minimum, onWidth, schedule, cancel, now }) {
	const accepts = createWidthGate({ minimum, now });
	let pending = null;
	let timer = null;

	let opened = false;

	return {
		measured(value) {
			// The FIRST width is not a change, it is the board arriving. Making it wait left the
			// note blank for the length of the settle every time it was opened.
			if (!opened) {
				opened = true;
				if (accepts(value)) {
					onWidth(value);
					return;
				}
			}

			pending = value;
			if (timer !== null) cancel(timer);
			timer = schedule(() => {
				timer = null;
				if (accepts(pending)) onWidth(pending);
			}, SETTLE_MS);
		},
		stop() {
			if (timer !== null) cancel(timer);
			timer = null;
		},
	};
}
