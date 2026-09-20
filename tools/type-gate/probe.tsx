import { createWidget, defineManifest, defineProp, useData } from "widgetarium";
import type { RecordRef, WidgetProps } from "widgetarium";

type Entry = { title: string; done?: boolean };
type Tab = { name: string; board?: string; ref: RecordRef };

export const manifest = defineManifest({
	title: "Probe",
	description: "The widget the type gate is measured on.",
	props: {
		heading: defineProp<string>()({ default: "To do" }),
		pageSize: defineProp<number>()({ default: 10, design: true }),
		open: defineProp<boolean>()({ default: false, keep: "screen", writes: ["update"] }),
		entries: defineProp<Entry[]>()({
			default: [],
			writes: ["create", "update"],
			describes: { done: { aka: ["complete"] } },
		}),
		tabs: defineProp<Tab[]>()({ default: [], writes: ["create", "update", "remove"], describes: { name: "Label" } }),
		current: defineProp<string>()({ of: "tabs", fallback: "first" }),
	},
});

type Props = WidgetProps<typeof manifest>;

function pageOf(pageSize: Props["pageSize"]) {
	return useData(pageSize.get).data;
}

export default createWidget(manifest, ({ heading, entries, tabs, pageSize, open }) => {
	const shown = useData(entries.list).data;
	const said = useData(heading.get).data;
	const named = useData(tabs.list).data.map((tab) => `${tab.ref}${tab.name}`);
	open.update(true);
	return `${said}${shown.map((entry) => `${entry.ref}${entry.title}${entry.done}`).join("")}${named.join("")}${pageOf(pageSize)}`;
});
