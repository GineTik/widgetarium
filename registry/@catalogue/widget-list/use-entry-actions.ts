import { useState } from "react";
import type { PointerEvent } from "react";
import type { CommandAnswer, PropsOf } from "widgetarium";
import type { Entry, EntryState } from "./types";
import type WidgetList from "./widget";

type ListProps = PropsOf<typeof WidgetList>;

export interface EntryCommands {
	readonly install: ListProps["install"];
	readonly pick: ListProps["pick"];
	readonly place: ListProps["place"];
	readonly carrier: ListProps["carrier"];
}

interface EntryActionsAsked {
	readonly entry: Entry;
	readonly state: EntryState;
	readonly isBusy: boolean;
	readonly isAsking: boolean;
	readonly commands: EntryCommands;
}

export function useEntryActions(asked: EntryActionsAsked) {
	const { entry, commands } = asked;
	const [failure, setFailure] = useState<string | null>(null);
	const run = (sent: Promise<CommandAnswer>) => sent.then((answer) => setFailure(answer.ok ? null : answer.reason));
	const press = () => {
		if (asked.isBusy) return;
		void run(
			asked.state === "add" ? commands.pick({ widget: entry.id }) : installEntry(entry.id, asked.isAsking, commands),
		);
	};
	return { failure, press, lift: lifterOf(entry, commands, run) };
}

function lifterOf(
	entry: Entry,
	{ carrier, place }: EntryCommands,
	run: (sent: Promise<CommandAnswer>) => Promise<void>,
) {
	return (event: PointerEvent<HTMLElement>) => {
		if (!carrier.canCarry || event.button !== 0) return;
		void carrier.lift(event, { widget: entry.id, label: entry.name }).then((at) => {
			if (at) void run(place({ widget: entry.id, at }));
		});
	};
}

function installEntry(widget: string, isAsking: boolean, { install, pick }: EntryCommands): Promise<CommandAnswer> {
	const installed = install({ widget });
	if (!isAsking) return installed;
	return installed.then((answer) => (answer.ok ? pick({ widget }) : answer));
}
