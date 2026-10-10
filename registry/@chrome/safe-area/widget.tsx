import { IQuery, createWidget, defineLayout, defineMetadata, defineStates } from "widgetarium";
import { z } from "zod";
import { PLATFORMS } from "@chrome/lib";
import { CaptionButtons } from "./caption-buttons";

const SIDES = ["left", "right"] as const;

type Platform = (typeof PLATFORMS)[number];

type Side = (typeof SIDES)[number];

const OWNER_OF_SIDE: Readonly<Record<Side, Platform>> = { left: "macos", right: "windows" };

const TRAFFIC_LIGHTS = ["bg-red", "bg-yellow", "bg-green"] as const;

const SafeArea = createWidget({
	inject: {
		getSide: IQuery.output(z.enum(SIDES).default("left")),
		getPlatform: IQuery.output(z.enum(PLATFORMS).default("macos")),
		getDrawsSystemButtons: IQuery.output(z.boolean().default(false)),
	},
	draw: ({ getSide: side, getPlatform: platform, getDrawsSystemButtons: drawsSystemButtons }) => {
		if (OWNER_OF_SIDE[side] !== platform) return <span className="block w-1 shrink-0" data-name="Window edge" />;
		if (side === "left") return <TrafficLights isDrawn={drawsSystemButtons} />;
		return <CaptionButtons isDrawn={drawsSystemButtons} />;
	},
});

function TrafficLights({ isDrawn }: { readonly isDrawn: boolean }) {
	return (
		<span
			className="flex h-11 w-[76px] shrink-0 items-center gap-2 pl-4"
			data-name="macOS window buttons"
			aria-hidden="true"
		>
			{isDrawn ? TRAFFIC_LIGHTS.map((fill) => <span key={fill} className={`size-3 rounded-pill ${fill}`} />) : null}
		</span>
	);
}

export const metadata = defineMetadata(SafeArea, {
	title: "Safe area",
	description:
		"The corner the operating system keeps for its own window buttons, so nothing of the app stands under them.",
	keywords: ["safe area", "window", "traffic lights", "caption buttons", "titlebar", "chrome", "macos", "windows"],
	props: {
		getSide: { label: "Side", hint: "Left holds macOS's three buttons, right holds Windows' three." },
		getPlatform: {
			label: "Platform",
			hint: "The system the app runs on; a corner the system leaves free keeps only a narrow edge.",
		},
		getDrawsSystemButtons: {
			label: "Draw the system's buttons",
			hint: "Only for a design: the system draws its own buttons over this space.",
			design: true,
		},
	},
});

export const layout = defineLayout({ role: "control", size: { preferredWidth: 138, preferredHeight: 44 } });

export const states = defineStates(SafeArea, {
	"macOS left": { getSide: "left", getPlatform: "macos", getDrawsSystemButtons: true },
	"Windows right": { getSide: "right", getPlatform: "windows", getDrawsSystemButtons: true },
	"Web left": { getSide: "left", getPlatform: "web" },
});

export default SafeArea;
