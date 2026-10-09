import type { RegistryReading } from "./catalogue-read.js";
import type { CommandView, PropView, WidgetCardView, WidgetRowView } from "./catalogue-views.js";

const NOTHING = "none";
const INDENT = "  ";

export function rowsText(rows: readonly WidgetRowView[], registries: readonly RegistryReading[]): string {
	const idWidth = Math.max(0, ...rows.map(({ id }) => id.length));
	const roleWidth = Math.max(0, ...rows.map(({ role }) => (role ?? "").length));
	const lines = rows.map(
		({ id, role, title, description }) =>
			`${id.padEnd(idWidth)}  ${(role ?? "").padEnd(roleWidth)}  ${title}: ${description}`,
	);
	return [...lines, ...registryNotesOf(registries), `${rows.length} widget(s)`].join("\n");
}

export function cardText(view: WidgetCardView): string {
	return [
		`${view.id}: ${view.title}`,
		view.description,
		`role: ${view.role ?? NOTHING}`,
		`from: ${view.registry}/${view.folder}`,
		...listed("props", view.props.map(propLineOf)),
		...listed("commands", view.commands.map(commandLineOf)),
		`slots: ${joinedOrNothing(view.slots)}`,
		`files: ${joinedOrNothing(view.files)}`,
		`libs: ${joinedOrNothing(view.libs)}`,
		`dependencies: ${joinedOrNothing(Object.entries(view.dependencies).map(([name, range]) => `${name}@${range}`))}`,
		`draws: ${joinedOrNothing(view.widgetDependencies)}`,
	].join("\n");
}

function registryNotesOf(registries: readonly RegistryReading[]): string[] {
	return registries.flatMap(({ at, refusal, problems }) => [
		...(refusal === null ? [] : [`${at}: ${refusal}`]),
		...problems.map((problem) => `${at}: ${problem}`),
	]);
}

function propLineOf(prop: PropView): string {
	const shape = [prop.kind, prop.control ?? prop.type].filter((part) => part !== null).join(" ");
	const verbs = prop.verbs.length > 0 ? `, verbs ${prop.verbs.join(" ")}` : "";
	const source = prop.source === null ? "" : `, from ${prop.source}`;
	const fields = prop.fields.length > 0 ? `, fields ${prop.fields.join(" ")}` : "";
	return `${prop.name}: ${shape}${verbs}${source}${fields}${prop.label === null ? "" : `; ${prop.label}`}`;
}

function commandLineOf(command: CommandView): string {
	const source = command.source === null ? "" : ` (${command.source})`;
	return `${command.name}: ${command.label ?? ""}${source}`;
}

function listed(heading: string, lines: readonly string[]): string[] {
	if (lines.length === 0) return [`${heading}: ${NOTHING}`];
	return [`${heading}:`, ...lines.map((line) => `${INDENT}${line}`)];
}

function joinedOrNothing(items: readonly string[]): string {
	return items.length === 0 ? NOTHING : items.join(", ");
}
