import { Icon, IconButton } from "widgetarium/kit";
import { EntryRing } from "./entry-ring";
import type { EntryState, Job } from "./types";

const GO_CLASS = {
	add: "wg-catalogue-card-go",
	install: "wg-catalogue-card-go is-install",
	update: "wg-catalogue-card-go is-update",
	failed: "wg-catalogue-card-go is-failed",
} as const;

const GLYPH = { add: "plus", install: "download", update: "refresh-cw", failed: "rotate-ccw" } as const;

interface EntryGoProps {
	readonly busyJob: Job | null;
	readonly state: EntryState;
	readonly label: string;
	readonly press: () => void;
}

export function EntryGo({ busyJob, state, label, press }: EntryGoProps) {
	if (busyJob) return <EntryRing job={busyJob} label={label} />;
	return (
		<IconButton
			className={GO_CLASS[state]}
			variant={state === "add" ? "accent" : "ghost"}
			size="s"
			label={label}
			onClick={(event) => {
				event.stopPropagation();
				press();
			}}
		>
			<Icon name={GLYPH[state]} size={15} />
		</IconButton>
	);
}
