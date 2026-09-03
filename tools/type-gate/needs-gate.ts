import type {
	Action,
	Aka,
	CollectionGateway,
	Color,
	Day,
	ListAction,
	Patch,
	Query,
	Ref,
	RemoveAction,
	Text,
	UpdateAction,
} from "widgetarium";

type Habit = {
	days: Day[] & Aka<"entries" | "dates" | "log">;
	title?: Text & Aka<"name">;
	color?: Color;
	goal?: number;
};

type Accesses = {
	list: ListAction;
	update: UpdateAction;
	remove?: RemoveAction;
	archive?: Action<Ref, void>;
};

declare const habits: CollectionGateway<Habit, Accesses>;

export async function readsThroughDeclaredVerbs(): Promise<number> {
	const listed = await habits.list({ limit: 3 } satisfies Query);
	const first = listed.rows[0]?.value;
	const patch: Patch<Habit> = { ref: "Habits/Reading.md", data: { goal: 21 } };
	await habits.update(patch);
	if (habits.remove.can().can) await habits.remove("Habits/Reading.md");
	if (habits.archive.can().can) await habits.archive("Habits/Reading.md");
	return first ? first.days.length : 0;
}

export function akaAcceptsAPlainValue(days: Day[]): Habit["days"] {
	return days;
}

export function akaYieldsAPlainValue(days: Habit["days"]): Day[] {
	return days;
}

declare const unstated: CollectionGateway<Habit>;

export async function unstatedAccessesKeepEveryEngineVerb(): Promise<void> {
	await unstated.create({ goal: 1 });
	await unstated.get("Habits/Reading.md");
}

type Mispaired = { list: RemoveAction };
type ListOfMispaired = CollectionGateway<Habit, Mispaired>["list"];

export const aVerbUnderTheWrongNameResolvesToNever: [ListOfMispaired] extends [never] ? true : false = true;

export function anUndeclaredVerbIsAbsent(): unknown {
	// @ts-expect-error create was not declared in Accesses, so the gateway does not carry it
	return habits.create;
}

type SlotHoldingSomethingElse = CollectionGateway<Habit, { list: string }>["list"];

export const aSlotThatIsNeitherAnEngineVerbNorAnActionResolvesToNever: [SlotHoldingSomethingElse] extends [never]
	? true
	: false = true;

interface AccessesAsAnInterface {
	list: ListAction;
}

export async function anInterfaceDeclaresVerbsToo(): Promise<number> {
	const listed = await (null as unknown as CollectionGateway<Habit, AccessesAsAnInterface>).list();
	return listed.total;
}
