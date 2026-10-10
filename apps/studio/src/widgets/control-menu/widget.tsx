import { createElement as h, useState } from "react";
import { z } from "zod";
import { Popover } from "@widgetarium/kit";
import { defineLayout, defineMetadata } from "@widgetarium/core/gateway/declared.js";
import { PageInputSchema, PageOf } from "@widgetarium/core/gateway/page.js";
import { ICommand, IQuery } from "@widgetarium/core/gateway/queries.js";
import { useData } from "@widgetarium/core/gateway/use-data.js";
import { createWidget } from "@widgetarium/core/widget-api.js";
import { AppAskedSchema, NothingAskedSchema, StudioAppSchema } from "../../shared/studio-app.js";
import { useRefusal } from "../use-refusal.js";
import { AppList } from "./app-list.js";
import { CurrentApp } from "./current-app.js";
import { MenuTrigger } from "./menu-trigger.js";
import { QuietLine } from "./quiet-line.js";

const APPS_AT_MOST = 50;

const NOTHING_ASKED = {};

const ENTER_CANVAS = { icon: "pencil-ruler", said: "Edit in canvas" };

const LEAVE_CANVAS = { icon: "arrow-left", said: "Back to view" };

const ControlMenu = createWidget({
	inject: {
		getCurrentApp: IQuery.input(NothingAskedSchema).output(StudioAppSchema),
		getApps: IQuery.input(PageInputSchema).output(PageOf(StudioAppSchema)),
		openApp: ICommand.input(AppAskedSchema),
		createApp: ICommand,
		editInCanvas: ICommand,
		getIsInCanvas: IQuery.output(z.boolean().default(false)),
		backToView: ICommand,
	},
	draw: ({ getCurrentApp, getApps, openApp, createApp, editInCanvas, getIsInCanvas, backToView }) => {
		const [isOpen, setOpen] = useState(false);
		const { data: current, failure: currentFailure } = useData(getCurrentApp, NOTHING_ASKED);
		const { data: apps, failure: appsFailure } = useData(getApps, { limit: APPS_AT_MOST });
		const { refusal, isAnsweredOk } = useRefusal();
		const closedOnOk = (answer: ReturnType<typeof createApp>): void => {
			void isAnsweredOk(answer).then((isOk) => isOk && setOpen(false));
		};
		const canvas = getIsInCanvas
			? { ...LEAVE_CANVAS, run: () => closedOnOk(backToView()) }
			: { ...ENTER_CANVAS, run: () => closedOnOk(editInCanvas()) };
		return (
			<Popover
				open={isOpen}
				onOpenChange={setOpen}
				placement="below"
				trigger={<MenuTrigger app={current} isOpen={isOpen} />}
			>
				<div className="wg-studio-menu" data-name="Control menu">
					{current ? (
						<CurrentApp app={current} canvas={canvas} />
					) : (
						<QuietLine said={currentFailure} name="Current app failure" />
					)}
					{appsFailure === null ? (
						<AppList
							apps={apps}
							currentId={current?.id ?? ""}
							onOpen={(id) => closedOnOk(openApp({ id }))}
							onCreate={() => closedOnOk(createApp())}
						/>
					) : (
						<QuietLine said={appsFailure} name="Apps failure" />
					)}
					<QuietLine said={refusal} name="Refusal" />
				</div>
			</Popover>
		);
	},
});

export const metadata = defineMetadata(ControlMenu, {
	title: "Control menu",
	description: "The studio's corner button: switch to another app, or edit, set up and connect this one.",
	keywords: ["app switcher", "menu", "control", "settings", "studio", "corner", "apps"],
	props: {
		getCurrentApp: { label: "This app", hint: "The app the studio shows: its mark is the button." },
		getApps: { label: "Apps", hint: "Every app the person can switch to." },
		openApp: { label: "Open an app", hint: "Switches to the app pressed in the list." },
		createApp: { label: "New app", hint: "Starts a new app." },
		editInCanvas: { label: "Edit in canvas", hint: "Shows this app's design canvas." },
		getIsInCanvas: { label: "In the canvas", hint: "On, the menu offers to go back to the app." },
		backToView: { label: "Back to view", hint: "Leaves the canvas for the app." },
	},
});

export const layout = defineLayout({ role: "control", size: { preferredWidth: 34, preferredHeight: 34 } });

export default ControlMenu;
