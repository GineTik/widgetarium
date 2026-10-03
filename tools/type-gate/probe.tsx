import {
	ICrudGateway,
	IValueGateway,
	RecordRefSchema,
	createWidget,
	defineLayout,
	defineMetadata,
	defineMigrations,
	useData,
	z,
} from "widgetarium";
import type { PropsOf } from "widgetarium";

const Entry = z.object({
	title: z.string(),
	done: z
		.boolean()
		.optional()
		.meta({ aka: ["complete"] }),
});
const Tab = z.object({ name: z.string(), board: z.string().optional(), ref: RecordRefSchema });

const Probe = createWidget({
	inject: {
		heading: IValueGateway.of(z.string().default("To do")).pick("get"),
		pageSize: IValueGateway.of(z.number().default(10)).pick("get"),
		open: IValueGateway.of(z.boolean().default(false)).pick("get", "update"),
		entries: ICrudGateway.of(Entry).pick("list", "create", "update"),
		tabs: ICrudGateway.of(Tab),
		current: IValueGateway.of(z.unknown()).pick("get"),
	},
	draw: ({ heading, entries, tabs, pageSize, open }) => {
		const shown = useData(entries.list).data;
		const named = useData(tabs.list).data.map((tab) => `${tab.ref}${tab.name}`);
		open.update(true);
		entries.createMany([{ title: "One" }]).then((made) => made.done.map((row) => row?.ref));
		entries.upsert({ ref: null, data: { title: "Two" } });
		return `${heading}${shown.map((entry) => `${entry.ref}${entry.title}${entry.done}`).join("")}${named.join("")}${pageSize + 1}${open.value}`;
	},
});

export const metadata = defineMetadata(Probe, {
	title: "Probe",
	description: "The widget the type gate is measured on.",
	props: {
		pageSize: { design: true },
		open: { keep: "screen" },
		tabs: { describes: { name: "Label" } },
		current: { source: { implementation: "@core/selection", fields: { rows: "tabs", whenNothingPicked: "first" } } },
	},
});

export const layout = defineLayout({ size: { preferredWidth: "full", preferredHeight: "auto" } });

export function pageOf(pageSize: PropsOf<typeof Probe>["pageSize"]) {
	return pageSize + 1;
}

export const migrations = defineMigrations([
	{
		from: { heading: IValueGateway.of(z.number().default(0)).pick("get") },
		run: (old) => ({
			heading: { implementation: "@core/typed-value", fields: { value: String(old.heading?.fields?.value ?? "") } },
		}),
	},
]);

export default Probe;
