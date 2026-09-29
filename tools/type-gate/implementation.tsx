import {
	ICrudGateway,
	IListGateway,
	IValueGateway,
	RecordRefSchema,
	createWidget,
	defineProps,
	useData,
	z,
} from "widgetarium";
import type { GivenProps, Implementation, Query, RecordRef, Row, RowsResult } from "widgetarium";

const BoardSchema = z.object({ name: z.string(), columns: z.array(z.string()) });
type Board = z.infer<typeof BoardSchema>;

const PickedRef = IValueGateway.of(z.string()).pick("get", "update");

const TaskSchema = z.object({ title: z.string(), board: z.string() });
type Task = z.infer<typeof TaskSchema>;

class SelectedRow extends IValueGateway {
	constructor(
		private readonly fields: {
			rows: IListGateway;
			picked: Implementation<typeof PickedRef>;
			whenNothingPicked: "none" | "first";
		},
	) {
		super();
	}

	async get() {
		const { rows } = await this.fields.rows.list();
		const ref = await this.fields.picked.get();
		const found = rows.find((row) => row.ref === ref);
		if (found || this.fields.whenNothingPicked === "none") return found ?? null;
		return rows[0] ?? null;
	}

	async update(row: Row<unknown>) {
		await this.fields.picked.update(row.ref);
		return row;
	}
}

class BoardsInMemory extends IListGateway.of(BoardSchema) {
	constructor(private readonly boards: Row<Board>[]) {
		super();
	}

	list(query?: Query): RowsResult<Board> {
		const limit = query?.limit ?? this.boards.length;
		return { rows: this.boards.slice(0, limit), total: this.boards.length };
	}

	get(ref: RecordRef) {
		return this.boards.find((board) => board.ref === ref) ?? null;
	}
}

class TasksInMemory extends ICrudGateway.of(TaskSchema).pick("list", "get", "create") {
	private readonly held: Row<Task>[] = [];

	list() {
		return { rows: this.held, total: this.held.length };
	}

	get(ref: RecordRef) {
		return this.held.find((task) => task.ref === ref) ?? null;
	}

	create(data: Partial<Task>) {
		const made = { title: "", board: "", ...data, ref: RecordRefSchema.parse(String(this.held.length)) };
		this.held.push(made);
		return made;
	}
}

const props = defineProps({
	board: IValueGateway.of(BoardSchema.nullable().default(null)).pick("get"),
	tasks: ICrudGateway.of(TaskSchema).pick("list", "create"),
});

const Board = createWidget({
	inject: props,
	draw: ({ board, tasks }) => {
		const shown = useData(tasks.list).data;
		return `${board?.name ?? ""}${shown.length}`;
	},
});

declare const picked: Implementation<typeof PickedRef>;
const boards = new BoardsInMemory([]);
const given: GivenProps<typeof props> = {
	board: new SelectedRow({ rows: boards, picked, whenNothingPicked: "first" }),
	tasks: new TasksInMemory(),
};

export { Board, given };
