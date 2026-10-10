import { ISlot, createWidget, defineLayout, defineMetadata, defineStates } from "widgetarium";
import type { SlotList } from "widgetarium";
import { Container } from "widgetarium/kit";
import { READING_APP, SAMPLE_APPS, WIDGETARIUM_APP } from "@chrome/lib";

const AppChromePage = createWidget({
	inject: {
		start: ISlot.array(),
		end: ISlot.array(),
		app: ISlot.array(),
	},
	draw: ({ start, end, app }) => (
		<div className="relative flex min-h-[832px] w-full flex-col" data-name="Window">
			<div className="pt-4" data-name="App">
				<Container width={1040}>
					<Slots of={app} />
				</Container>
			</div>
			<div
				className="pointer-events-none absolute inset-x-0 top-0 flex h-11 items-center justify-between"
				data-name="Corners"
			>
				<div className="pointer-events-auto flex h-11 items-center gap-1" data-name="Left corner">
					<Slots of={start} />
				</div>
				<div className="pointer-events-auto flex h-11 items-center gap-1" data-name="Right corner">
					<Slots of={end} />
				</div>
			</div>
		</div>
	),
});

function Slots({ of }: { readonly of: SlotList }) {
	return (
		<>
			{of.map((Slot) => (
				<Slot key={Slot.id} />
			))}
		</>
	);
}

export const metadata = defineMetadata(AppChromePage, {
	title: "App chrome",
	description: "A window with no header bar: the system's corners, the control menu and the AI button over the app.",
	keywords: ["chrome", "window", "titlebar", "safe area", "app switcher", "ai", "layout", "page"],
	props: {
		start: { label: "Left corner", hint: "The left safe area, then the control menu." },
		end: { label: "Right corner", hint: "The AI button, then the right safe area." },
		app: { label: "App", hint: "Everything the app draws under and between the corners." },
	},
});

export const layout = defineLayout({ role: "layout", size: { preferredWidth: "full", preferredHeight: "auto" } });

type Platform = "macos" | "windows" | "web";

type AiLook = "rest" | "hover" | "open";

const PHOTO = "https://images.unsplash.com/{id}?w=800";

const READING_NOW = [
	{
		title: "The Overstory",
		subtitle: "Richard Powers",
		meta: "Page 212 of 502",
		photo: PHOTO.replace("{id}", "photo-1512820790803-83ca734da794"),
		badge: "Novel",
	},
	{
		title: "Braiding Sweetgrass",
		subtitle: "Robin Wall Kimmerer",
		meta: "Page 88 of 391",
		photo: PHOTO.replace("{id}", "photo-1495446815901-a7297e633e8d"),
		badge: "Essays",
	},
	{
		title: "Piranesi",
		subtitle: "Susanna Clarke",
		meta: "Page 140 of 272",
		photo: PHOTO.replace("{id}", "photo-1544947950-fa07a98d237f"),
		badge: "Novel",
	},
];

const SAMPLE_APP_BODY = [
	{
		widget: "@default/hero",
		props: {
			getEyebrow: "Reading list",
			getTitle: "3 books in progress",
			getText: "Piranesi is closest to done: 132 pages left",
			getTone: "orange",
			getAction: "Continue Piranesi",
		},
	},
	{
		widget: "@default/section",
		props: {
			getHeading: "Reading now",
			widgets: [{ widget: "@default/photo-cards", props: { getCards: READING_NOW, getShape: "wide" } }],
		},
	},
];

const safeArea = (side: "left" | "right", platform: Platform) => ({
	widget: "@chrome/safe-area",
	props: { getSide: side, getPlatform: platform, getDrawsSystemButtons: true },
});

const menu = (props: Readonly<Record<string, unknown>>) => ({
	widget: "@chrome/control-menu",
	props: { getCurrentApp: READING_APP, getApps: [...SAMPLE_APPS], ...props },
});

const aiButton = (props: Readonly<Record<string, unknown>>) => ({ widget: "@chrome/ai-button", props });

const windowOf = (
	platform: Platform,
	menuProps: Readonly<Record<string, unknown>> = {},
	ai: { getLook?: AiLook; getIsShown?: boolean } = {},
) => ({
	start: [safeArea("left", platform), menu(menuProps)],
	end: [aiButton(ai), safeArea("right", platform)],
	app: SAMPLE_APP_BODY,
});

const opened = (variant: string) => ({ getIsOpen: true, getVariant: variant });

export const states = defineStates(AppChromePage, {
	macOS: windowOf("macos"),
	Windows: windowOf("windows"),
	"Web and Obsidian": windowOf("web"),
	Hover: windowOf("macos", {}, { getLook: "hover" }),
	"Sidebar open": windowOf("macos", {}, { getLook: "open" }),
	"Space kept": windowOf("macos", {}, { getIsShown: false }),
	"A two columns": windowOf("macos", opened("two-columns")),
	"B mirrored": windowOf("macos", opened("mirrored")),
	"C stacked": windowOf("macos", opened("stacked")),
	"D rail": windowOf("macos", opened("rail")),
	"A on Windows": windowOf("windows", opened("two-columns")),
	"First app": windowOf("macos", { getIsOpen: true, getCurrentApp: WIDGETARIUM_APP, getApps: [] }),
	Empty: { start: [], end: [], app: [] },
});

export default AppChromePage;
