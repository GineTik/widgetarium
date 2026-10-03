import { ICrudGateway, createWidget, z } from "widgetarium";
import type { GivenProps } from "widgetarium";

const TaskSchema = z.object({ title: z.string() });

class ReadsOnly extends ICrudGateway.of(TaskSchema) {
	list() {
		return { rows: [], total: 0 };
	}

	get() {
		return null;
	}
}

export const Tasks = createWidget({ inject: { tasks: ICrudGateway.of(TaskSchema).pick("create") }, draw: () => null });
export const given: GivenProps<typeof Tasks.declared> = { tasks: new ReadsOnly() };
