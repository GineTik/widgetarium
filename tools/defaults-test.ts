import { ICrudGateway, IValueGateway, z } from "../packages/core/src/gateway/declared.ts";
import {
	RowsInMemoryGateway,
	ValueInMemoryGateway,
	defaultImplementationFor,
	defineDefaultImplementation,
} from "../packages/core/src/gateway/defaults.ts";
import { gatewayOverImplementation } from "../packages/core/src/gateway/adapted.js";
import { declarationIn } from "../packages/core/src/gateway/declaration.ts";
import { present } from "./page-dom.ts";
import { collectionOf, valueGatewayOf } from "./gateway-kinds.ts";
import { fieldIn } from "./held-fields.ts";

let failed = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${what}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(wanted)}`}`,
	);
}

function refusal(run: () => void): string | null {
	try {
		run();
		return null;
	} catch (failure) {
		return failure instanceof Error ? failure.message : String(failure);
	}
}

const TaskSchema = z.object({ title: z.string() });
const Tasks = ICrudGateway.of(TaskSchema).pick("list", "update", "create");
const Heading = IValueGateway.of(z.string()).pick("get", "update");

check(
	"a list interface names rows kept in memory as its default",
	defaultImplementationFor(Tasks, "tasks").name,
	"RowsInMemoryGateway",
);
check(
	"a value interface names a value kept in memory",
	defaultImplementationFor(Heading, "heading").name,
	"ValueInMemoryGateway",
);

const tasks = collectionOf(
	gatewayOverImplementation(
		"tasks",
		present(declarationIn(Tasks), "the tasks declaration"),
		new RowsInMemoryGateway({ rows: [{ title: "Write" }] }),
	),
);
const created = await tasks.create({ title: "Ship" });
await tasks.update({ ref: present((await tasks.list()).rows[0], "the first task").ref, data: { title: "Write well" } });
check(
	"a list handed over as plain rows keeps the rows it is given",
	(await tasks.list()).rows.map((row) => fieldIn(row, "title")),
	["Write well", "Ship"],
);
check("and a row it creates gets an address of its own", typeof created?.ref, "string");

const heading = valueGatewayOf(
	gatewayOverImplementation(
		"heading",
		present(declarationIn(Heading), "the heading declaration"),
		new ValueInMemoryGateway({ value: "Habit" }),
	),
);
await heading.update("Run");
check("a value handed over plainly takes the write it is given", await heading.get(), "Run");

class Half extends ICrudGateway {
	list(): { rows: never[]; total: number } {
		return { rows: [], total: 0 };
	}
	get(): null {
		return null;
	}
}
check(
	"a default that lacks a verb of its interface is refused by name",
	refusal(() => defineDefaultImplementation(ICrudGateway.of(TaskSchema), Half)),
	"Half cannot be the default of Declared: it has no create",
);

console.log(`\n${failed === 0 ? "defaults: clean" : `defaults: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
