import { browserStudioHost } from "../apps/studio/src/browser-studio-host.ts";

interface TitlebarRect {
	readonly x: number;
	readonly width: number;
}

class FakeControlsOverlay extends EventTarget {
	constructor(
		public visible: boolean,
		public rect: TitlebarRect,
	) {
		super();
	}

	getTitlebarAreaRect(): TitlebarRect {
		return this.rect;
	}
}

const WINDOW_PX = 1000;
const MAC_RECT = { x: 76, width: 800 };
const WIDER_RECT = { x: 90, width: 700 };

let failed = 0;
function check(what: string, held: unknown, wanted: unknown): void {
	const isOk = JSON.stringify(held) === JSON.stringify(wanted);
	if (!isOk) failed += 1;
	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(held)}`);
}

function hostOver(overlay: FakeControlsOverlay): ReturnType<typeof browserStudioHost> {
	Object.defineProperty(globalThis, "window", { value: { innerWidth: WINDOW_PX }, configurable: true });
	Object.defineProperty(globalThis.navigator, "windowControlsOverlay", { value: overlay, configurable: true });
	return browserStudioHost({ name: "Farm", iconHref: "" }, []);
}

const shown = new FakeControlsOverlay(true, MAC_RECT);
const host = hostOver(shown);
check("a visible overlay leaves its titlebar's sides as insets", host.insets(), { left: 76, right: 124 });

const heard: unknown[] = [];
const stop = host.onInsets(() => heard.push(host.insets()));
shown.rect = WIDER_RECT;
shown.dispatchEvent(new Event("geometrychange"));
check("a geometrychange re-reads the insets", heard, [{ left: 90, right: 210 }]);
stop();
shown.dispatchEvent(new Event("geometrychange"));
check("a stopped listener hears no more changes", heard.length, 1);

check("a hidden overlay keeps no inset", hostOver(new FakeControlsOverlay(false, MAC_RECT)).insets(), {
	left: 0,
	right: 0,
});

if (failed > 0) {
	console.log(`studio host: ${failed} failed`);
	process.exit(1);
}
console.log("studio host: clean");
