# Examples

Whole boards with every node's surface written, then the four code patterns. Build what these build.

## A dashboard with a rail on each side

Navigation left, the work in the middle, what is worth knowing about it on the right.

````markdown
---
widgetarium: { kind: screen }
---

# Sessions

```widgetarium
v: 2
base: three-pane
tiles:
  - id: nav
    widget: "@default/icon-list"
    props:
      getEntries: { implementation: "@obsidian/folder", fields: { path: Boards } }
  - id: running
    widget: "@flow/in-flight"
    props:
      getFlights: { implementation: "@obsidian/folder", fields: { path: Sessions } }
  - id: bugs
    widget: "@flow/plan-qa"
    props:
      getQuestions: { implementation: "@obsidian/folder", fields: { path: Bugs } }
  - id: tail
    widget: "@flow/session-tail"
    props:
      getLines: { implementation: "@obsidian/folder", fields: { path: Sessions/live.md } }
  - id: notice
    widget: "@flow/notice"
    props:
      getTitle: { implementation: "@core/typed-value", fields: { value: One bug found here } }
      getBody: { implementation: "@core/typed-value", fields: { value: normalizeBoard writes a surface onto a node the person set by hand. } }
      getTone: { implementation: "@core/typed-value", fields: { value: error } }
layout:
  dir: row
  of:
    - dir: column
      role: navigation
      purpose: Where to go
      surface: apart
      side: end
      width: 250
      collapse: { into: drawer, toggle: always }
      of:
        - { id: nav }
    - dir: column
      keep: true
      role: collection
      purpose: The work this vault is doing
      of:
        - { id: running }
        - { id: bugs }
    - dir: column
      role: detail
      purpose: The session being watched
      surface: apart
      side: start
      width: 320
      collapse: { into: drawer, toggle: adaptive }
      of:
        - { id: tail }
        - { id: notice }
```
````

The rails are `apart`: a line, no plate. Nothing else wears one: each tile is one thing standing
alone, and only a repeat earns a plate. A box wrapping a single tile would be a phantom. The rows the widgets draw inside are the
repeat, and the widgets plate them themselves.

## A list, a grid of complete things, and a bar

````markdown
---
widgetarium: { kind: screen }
---

# Music

```widgetarium
v: 2
tiles:
  - id: tabs
    widget: "@default/segmented-switch"
    props:
      getOptions: { implementation: "@core/typed-rows", fields: { rows: [{ name: Added }, { name: Title }, { name: Artist }] } }
  - id: tracks
    widget: "@media/track-list"
    props:
      getTracks: { implementation: "@obsidian/folder", fields: { path: Music/Tracks } }
      getFilter: { implementation: "@core/from-tile-value", fields: { ref: "tabs/getSelection" } }
  - id: albums
    widget: "@media/album-grid"
    props:
      getAlbums: { implementation: "@obsidian/folder", fields: { path: Music/Albums } }
  - id: player
    widget: "@media/player"
    props:
      getTracks: { implementation: "@obsidian/folder", fields: { path: Music/Tracks } }
      getPlaying: { implementation: "@core/from-tile-value", fields: { ref: "tracks/getSelection" } }
layout:
  dir: column
  of:
    - dir: column
      keep: true
      role: collection
      purpose: The library
      of:
        - dir: row
          role: collection
          purpose: Every track, filtered the way the switch says
          of:
            - { id: tabs }
            - { id: tracks }
        - dir: row
          role: collection
          purpose: The albums they came from
          of:
            - { id: albums }
    - dir: row
      role: composer
      purpose: What is playing
      surface: apart
      side: start
      of:
        - { id: player }
```
````

The switch and the track list stand bare: the list plates its own rows. The album grid wears **nothing**:
each album is a plate the widget draws, and a plate around them would be an edge drawn twice. The
player is `apart` along the bottom.

## A section, and the two ways it fills

````markdown
---
widgetarium: { kind: screen }
---

# Work

```widgetarium
v: 2
tiles:
  - id: projects
    widget: "@default/section"
    props:
      getHeading: { implementation: "@core/typed-value", fields: { value: Projects } }
      getBadge: { implementation: "@core/typed-value", fields: { value: 5 open } }
      getFilling: { implementation: "@core/typed-value", fields: { value: per-row } }
      getArrangement: { implementation: "@core/typed-value", fields: { value: grid } }
      getMinWidthPx: { implementation: "@core/typed-value", fields: { value: 280 } }
      getItems: { implementation: "@obsidian/folder", fields: { path: Projects } }
    slots:
      item: { widget: "@flow/project-card" }
  - id: today
    widget: "@default/section"
    props:
      getHeading: { implementation: "@core/typed-value", fields: { value: Today } }
      getFilling: { implementation: "@core/typed-value", fields: { value: placed } }
      getArrangement: { implementation: "@core/typed-value", fields: { value: column } }
    mounts:
      widgets:
        - { name: Reminders, widget: "@default/reminder" }
        - { name: Streak, widget: "@default/streak" }
      controls:
        - { name: Search, widget: "@default/search-input" }
layout:
  dir: row
  of:
    - dir: column
      keep: true
      role: collection
      purpose: The work this vault is doing
      of:
        - { id: projects }
    - dir: column
      role: detail
      purpose: What is waiting right now
      surface: apart
      side: start
      width: 320
      collapse: { into: drawer, toggle: adaptive }
      of:
        - { id: today }
```
````

`projects` fills **per row**: `@flow/project-card` is drawn again for every note in the folder, and
the grid wraps once a card would go under 280px. `today` fills **placed**: two widgets a person put
there, each with its own props; its `controls` govern that section only. Neither section wears a
plate: a `grid` gives every card one, a `column` leaves its widgets bare.

## Words on the screen

| Markdown | Where                                          |
| -------- | ---------------------------------------------- |
| `#`      | once per board, above the block                |
| `##`     | first in a region holding more than one widget |
| `###`    | first in a group, when a region holds several  |

A widget that names itself gets no title above it. Never skip a level. Text wears no surface.

## The code patterns

One feature, tasks, in the project layout `widget.md` describes. Every block below is a whole file;
`npm run test:docs-code` compiles them together.

### A shared schema both sides import

The schema is the meeting point: a widget and a handler never import each other, both import this.
A filter is a plain field picked from the record. A rule a write must satisfy (`min(1)`) belongs to
the input of the command that writes, never to a shape that is read.

```ts file=src/shared/schemas/task.ts
import { z } from "zod";

export const TaskStatusSchema = z.enum(["todo", "doing", "done"]);

export const TaskSchema = z.object({
	id: z.uuid(),
	title: z.string(),
	status: TaskStatusSchema,
	due: z.iso.date().nullable(),
});

export const TaskFilterSchema = TaskSchema.pick({ status: true }).partial();

export const NewTaskSchema = TaskSchema.pick({ id: true, due: true }).extend({ title: z.string().min(1) });

export type Task = z.infer<typeof TaskSchema>;
```

### A feature query mapping a ready source

`src/shared/sources/obsidian` ships generic handlers; this feature reads notes through one of them and
maps each note to a `Task`. The mapping and the business rule live here, never in the widget. Its
signature, as the project ships it:

```ts file=src/shared/sources/obsidian/notes.ts
import { ICommand, IQuery, PageInputSchema, PageOf } from "widgetarium";
import type { HandlerContext } from "widgetarium";
import { z } from "zod";

export const NoteSchema = z.object({ path: z.string(), properties: z.record(z.string(), z.unknown()) });
const NotePageSchema = PageOf(NoteSchema);
const NewNoteSchema = z.object({ name: z.string(), properties: z.record(z.string(), z.unknown()) });

export declare class NotesInFolderQuery extends IQuery.input(PageInputSchema).output(NotePageSchema) {
	constructor(fields: { path: string });
	query(input: z.output<typeof PageInputSchema>, ctx: HandlerContext): Promise<z.output<typeof NotePageSchema>>;
}

export declare class CreateNoteCommand extends ICommand.input(NewNoteSchema).output(NoteSchema) {
	constructor(fields: { path: string });
	run(input: z.output<typeof NewNoteSchema>, ctx: HandlerContext): Promise<z.output<typeof NoteSchema>>;
}
```

```ts file=src/logic/tasks/tasks-query.ts
import { IQuery, PageInputSchema, PageOf } from "widgetarium";
import type { HandlerContext } from "widgetarium";
import { z } from "zod";
import { TaskFilterSchema, TaskSchema } from "../../shared/schemas/task";
import type { Task } from "../../shared/schemas/task";
import { NoteSchema, NotesInFolderQuery } from "../../shared/sources/obsidian/notes";

const TasksInputSchema = PageInputSchema.extend(TaskFilterSchema.shape);
const TaskPageSchema = PageOf(TaskSchema);

export class TasksQuery extends IQuery.input(TasksInputSchema).output(TaskPageSchema) {
	readonly #notes = new NotesInFolderQuery({ path: "Tasks" });

	async query(input: z.output<typeof TasksInputSchema>, ctx: HandlerContext): Promise<z.output<typeof TaskPageSchema>> {
		const notes = await this.#notes.query({ cursor: input.cursor ?? null, limit: input.limit }, ctx);
		const tasks = notes.items.flatMap(taskOf);
		return { items: input.status ? tasks.filter((task) => task.status === input.status) : tasks, next: notes.next };
	}
}

function taskOf(note: z.output<typeof NoteSchema>): Task[] {
	const parsed = TaskSchema.safeParse({ ...note.properties, title: note.path.replace(/\.md$/, "") });
	return parsed.success ? [parsed.data] : [];
}
```

A page may come back shorter than `limit`; `next` alone says whether more exist.

### A list widget reading that query

The widget declares the port it needs, with the same input and output the handler serves, and draws
states. It never filters, maps fields or picks a row.

```tsx file=src/widgets/tasks/task-list/widget.tsx
import {
	IQuery,
	PageInputSchema,
	PageOf,
	createWidget,
	defineLayout,
	defineMetadata,
	defineStates,
	useData,
} from "widgetarium";
import { Badge, EmptyState, ItemGroup, LayoutItem, ShowMore } from "widgetarium/kit";
import { TaskFilterSchema, TaskSchema, TaskStatusSchema } from "../../../shared/schemas/task";

const TaskList = createWidget({
	inject: {
		getTasks: IQuery.input(PageInputSchema.extend(TaskFilterSchema.shape)).output(PageOf(TaskSchema)),
		getStatus: IQuery.output(TaskStatusSchema.default("todo")),
	},
	draw: ({ getTasks, getStatus: status }) => {
		const { data, isLoading, failure, hasMore, more } = useData(getTasks, { status, limit: 20 });
		if (failure) return <EmptyState title="The tasks could not be read" text={failure} />;
		if (!isLoading && data.length === 0) return <EmptyState title="Nothing in this status" />;
		return (
			<ItemGroup>
				{data.map((task) => (
					<LayoutItem key={task.id}>
						{task.title} <Badge size="s">{task.status}</Badge>
					</LayoutItem>
				))}
				{hasMore ? <ShowMore isLoading={isLoading} onMore={more} /> : null}
			</ItemGroup>
		);
	},
});

export const metadata = defineMetadata(TaskList, {
	title: "Task list",
	description: "Which tasks are in this status.",
	keywords: ["tasks", "todo", "status"],
});

export const layout = defineLayout({ role: "collection", size: { preferredWidth: "full", preferredHeight: "auto" } });

export const states = defineStates(TaskList, {
	Full: {
		getTasks: [{ id: "6f1c7c0e-4f7a-4c55-9a43-0b7a3e1f2d10", title: "Call the plumber", status: "todo", due: null }],
	},
	Empty: { getTasks: [] },
});

export default TaskList;
```

### A form widget and the command it sends

The widget mints the record's `id` at the press, so a retry writes nothing twice. An answer with
`ok: false` carries `reason`; `ran: true` means the write happened and only its output was refused,
so it is never sent again.

```ts file=src/logic/tasks/create-task-command.ts
import { ICommand } from "widgetarium";
import type { HandlerContext } from "widgetarium";
import { z } from "zod";
import { NewTaskSchema, TaskSchema } from "../../shared/schemas/task";
import { CreateNoteCommand } from "../../shared/sources/obsidian/notes";

export class CreateTaskCommand extends ICommand.input(NewTaskSchema).output(TaskSchema) {
	readonly #notes = new CreateNoteCommand({ path: "Tasks" });

	async run(input: z.output<typeof NewTaskSchema>, ctx: HandlerContext): Promise<z.output<typeof TaskSchema>> {
		const task = { ...input, status: "todo" as const };
		await this.#notes.run({ name: task.title, properties: { id: task.id, status: task.status, due: task.due } }, ctx);
		return task;
	}
}
```

```tsx file=src/widgets/tasks/new-task/widget.tsx
import { useState } from "react";
import { ICommand, createWidget, defineLayout, defineMetadata, defineStates } from "widgetarium";
import { Button, Input } from "widgetarium/kit";
import { NewTaskSchema, TaskSchema } from "../../../shared/schemas/task";

const NewTask = createWidget({
	inject: {
		createTask: ICommand.input(NewTaskSchema).output(TaskSchema),
	},
	draw: ({ createTask }) => {
		const [title, setTitle] = useState("");
		const [refusal, setRefusal] = useState<string | null>(null);
		const send = async (): Promise<void> => {
			const answer = await createTask({ id: crypto.randomUUID(), title, due: null });
			setRefusal(answer.ok ? null : answer.reason);
			if (answer.ok) setTitle("");
		};
		return (
			<form className="flex flex-col gap-cards" onSubmit={(event) => (event.preventDefault(), void send())}>
				<Input value={title} onValueChange={setTitle} placeholder="What needs doing" />
				{refusal ? <p className="text-destructive">{refusal}</p> : null}
				<Button type="submit" disabled={title.trim() === ""}>
					Add task
				</Button>
			</form>
		);
	},
});

export const metadata = defineMetadata(NewTask, {
	title: "New task",
	description: "Adds a task with a title.",
	keywords: ["task", "add", "form"],
});

export const layout = defineLayout({ role: "composer", size: { preferredWidth: 480, preferredHeight: "auto" } });

export const states = defineStates(NewTask, { Empty: {} });

export default NewTask;
```
