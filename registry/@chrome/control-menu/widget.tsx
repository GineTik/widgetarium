import { useState } from "react";
import type { ReactNode } from "react";
import { ICommand, IQuery, createWidget, defineLayout, defineMetadata, defineStates, useData } from "widgetarium";
import { z } from "zod";
import { Button, Popover } from "widgetarium/kit";
import { AppSchema, READING_APP, SAMPLE_APPS, WIDGETARIUM_APP } from "@chrome/lib";
import { AppList } from "./app-list";
import { AppRail } from "./app-rail";
import { AppMark, MARK_PX } from "./app-mark";
import { CurrentApp } from "./current-app";

const VARIANTS = ["two-columns", "mirrored", "stacked", "rail"] as const;

type Variant = (typeof VARIANTS)[number];

const APPS_AT_MOST = 50;

const ControlMenu = createWidget({
	inject: {
		getCurrentApp: IQuery.output(AppSchema.default(WIDGETARIUM_APP)),
		getApps: IQuery.output(z.array(AppSchema)),
		getVariant: IQuery.output(z.enum(VARIANTS).default("two-columns")),
		getIsOpen: IQuery.output(z.boolean().default(false)),
		openApp: ICommand.input(z.object({ id: z.string() })),
		createApp: ICommand,
		editInCanvas: ICommand,
	},
	draw: ({ getCurrentApp: current, getApps, getVariant: variant, getIsOpen, openApp, createApp, editInCanvas }) => {
		const [isOpen, setOpen] = useState<boolean | null>(null);
		const { data: apps } = useData(getApps, { limit: APPS_AT_MOST });
		const shown = isOpen ?? getIsOpen;
		const closedAfter =
			<Answer,>(run: () => Promise<Answer>) =>
			async () => {
				setOpen(false);
				await run();
			};
		const listed = {
			apps,
			currentId: current.id,
			onOpen: (id: string) => void closedAfter(() => openApp({ id }))(),
			onCreate: () => void closedAfter(createApp)(),
		};
		const control = <CurrentApp app={current} onEdit={() => void closedAfter(editInCanvas)()} />;
		const trigger = (
			<Button variant={shown ? "secondary" : "ghost"} size="icon" aria-label={`${current.name} menu`}>
				<AppMark app={current} px={MARK_PX.s} />
			</Button>
		);
		return (
			<Popover open={shown} onOpenChange={setOpen} placement="below" trigger={trigger}>
				{arrangementOf(variant, variant === "rail" ? <AppRail {...listed} /> : <AppList {...listed} />, control)}
			</Popover>
		);
	},
});

function arrangementOf(variant: Variant, list: ReactNode, control: ReactNode) {
	if (variant === "stacked")
		return (
			<div className="flex w-[280px] flex-col gap-parts" data-name="Stacked">
				{control}
				{list}
			</div>
		);
	if (variant === "rail")
		return (
			<div className="flex w-[300px] items-start gap-parts" data-name="Rail">
				{list}
				<div className="min-w-0 flex-1">{control}</div>
			</div>
		);
	const columns = variant === "mirrored" ? [control, list] : [list, control];
	return (
		<div
			className="grid w-[520px] grid-cols-2 items-start gap-parts"
			data-name={variant === "mirrored" ? "Mirrored" : "Two columns"}
		>
			{columns.map((column, at) => (
				<div key={at} className="min-w-0">
					{column}
				</div>
			))}
		</div>
	);
}

export const metadata = defineMetadata(ControlMenu, {
	title: "Control menu",
	description: "The app's corner button: switch to another app, or edit, set up and connect this one.",
	keywords: ["app switcher", "menu", "workspace", "control", "settings", "chrome", "corner", "apps"],
	props: {
		getCurrentApp: { label: "This app", hint: "The app the menu stands in: its mark is the button." },
		getApps: { label: "Apps", hint: "Every app the person can switch to." },
		getVariant: {
			label: "Arrangement",
			hint: "How the list and this app's controls share the dropdown.",
			options: [
				{ value: "two-columns", label: "List left, controls right" },
				{ value: "mirrored", label: "Controls left, list right" },
				{ value: "stacked", label: "Controls over the list" },
				{ value: "rail", label: "A rail of marks beside the controls" },
			],
			design: true,
		},
		getIsOpen: { label: "Starts open", hint: "Whether the dropdown is open when drawn.", design: true },
		openApp: { label: "Open an app", hint: "Switches to the app pressed in the list." },
		createApp: { label: "New app", hint: "Opens an empty canvas in a new tab." },
		editInCanvas: { label: "Edit in canvas", hint: "Opens this app's design canvas." },
	},
});

export const layout = defineLayout({ role: "navigation", size: { preferredWidth: 36, preferredHeight: 36 } });

const OPEN = { getCurrentApp: READING_APP, getApps: [...SAMPLE_APPS], getIsOpen: true };

export const states = defineStates(ControlMenu, {
	Closed: { getCurrentApp: READING_APP, getApps: [...SAMPLE_APPS] },
	"Two columns": { ...OPEN, getVariant: "two-columns" },
	Mirrored: { ...OPEN, getVariant: "mirrored" },
	Stacked: { ...OPEN, getVariant: "stacked" },
	Rail: { ...OPEN, getVariant: "rail" },
	Empty: { getApps: [], getIsOpen: true },
});

export default ControlMenu;
