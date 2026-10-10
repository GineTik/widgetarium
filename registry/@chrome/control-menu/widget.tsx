import { useState } from "react";
import { ICommand, IQuery, createWidget, defineLayout, defineMetadata, defineStates, useData } from "widgetarium";
import { z } from "zod";
import { Button, Popover } from "widgetarium/kit";
import { AppSchema, DRAFT_APP, READING_APP, SAMPLE_APPS, WIDGETARIUM_APP } from "@chrome/lib";
import { AppList } from "./app-list";
import { AppMark, MARK_PX } from "./app-mark";
import { CurrentApp } from "./current-app";

const APPS_AT_MOST = 50;

const DRAFT_ROW = { ...DRAFT_APP, ref: DRAFT_APP.id };

const ENTER_CANVAS = { icon: "pencil-ruler", said: "Edit in canvas" };

const LEAVE_CANVAS = { icon: "arrow-left", said: "Back to view" };

const ControlMenu = createWidget({
	inject: {
		getCurrentApp: IQuery.output(AppSchema.default(WIDGETARIUM_APP)),
		getApps: IQuery.output(z.array(AppSchema)),
		getIsOpen: IQuery.output(z.boolean().default(false)),
		openApp: ICommand.input(z.object({ id: z.string() })),
		createApp: ICommand,
		editInCanvas: ICommand,
		getIsInCanvas: IQuery.output(z.boolean().default(false)),
		backToView: ICommand,
	},
	draw: ({ getCurrentApp, getApps, getIsOpen, openApp, createApp, editInCanvas, getIsInCanvas, backToView }) => {
		const [isOpen, setOpen] = useState<boolean | null>(null);
		const { data: apps, isLoading } = useData(getApps, { limit: APPS_AT_MOST });
		const isDraft = !isLoading && apps.length === 0;
		const current = isDraft ? DRAFT_APP : getCurrentApp;
		const shown = isOpen ?? getIsOpen;
		const closedAfter =
			<Answer,>(run: () => Promise<Answer>) =>
			async () => {
				setOpen(false);
				await run();
			};
		const trigger = (
			<Button variant={shown ? "secondary" : "ghost"} size="icon-sm" aria-label={`${current.name} menu`}>
				<AppMark app={current} px={MARK_PX.s} />
			</Button>
		);
		return (
			<Popover open={shown} onOpenChange={setOpen} placement="below" trigger={trigger}>
				<div className="flex w-[280px] flex-col gap-parts" data-name="Control menu">
					<CurrentApp
						app={current}
						canvas={{
							...(getIsInCanvas ? LEAVE_CANVAS : ENTER_CANVAS),
							run: () => void closedAfter(getIsInCanvas ? backToView : editInCanvas)(),
						}}
					/>
					<AppList
						apps={isDraft ? [DRAFT_ROW] : apps}
						currentId={current.id}
						onOpen={(id) => void closedAfter(() => openApp({ id }))()}
						onCreate={() => void closedAfter(createApp)()}
					/>
				</div>
			</Popover>
		);
	},
});

export const metadata = defineMetadata(ControlMenu, {
	title: "Control menu",
	description: "The app's corner button: switch to another app, or edit, set up and connect this one.",
	keywords: ["app switcher", "menu", "workspace", "control", "settings", "chrome", "corner", "apps"],
	props: {
		getCurrentApp: { label: "This app", hint: "The app the menu stands in: its mark is the button." },
		getApps: { label: "Apps", hint: "Every app the person can switch to." },
		getIsOpen: { label: "Starts open", hint: "Whether the dropdown is open when drawn.", design: true },
		openApp: { label: "Open an app", hint: "Switches to the app pressed in the list." },
		createApp: { label: "New app", hint: "Opens an empty canvas in a new tab." },
		editInCanvas: { label: "Edit in canvas", hint: "Opens this app's design canvas." },
		getIsInCanvas: {
			label: "In the canvas",
			hint: "On, the menu stands in the app's canvas and offers to go back to the view.",
		},
		backToView: { label: "Back to view", hint: "Leaves the canvas for the page it shows." },
	},
});

export const layout = defineLayout({ role: "control", size: { preferredWidth: 34, preferredHeight: 34 } });

export const states = defineStates(ControlMenu, {
	Closed: { getCurrentApp: READING_APP, getApps: [...SAMPLE_APPS] },
	Open: { getCurrentApp: READING_APP, getApps: [...SAMPLE_APPS], getIsOpen: true },
	"In the canvas": { getCurrentApp: READING_APP, getApps: [...SAMPLE_APPS], getIsOpen: true, getIsInCanvas: true },
	"No apps": { getApps: [], getIsOpen: true },
});

export default ControlMenu;
