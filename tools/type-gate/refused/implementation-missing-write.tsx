import { ICrudGateway, createWidget, defineProps, z } from "widgetarium";
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

const props = defineProps({ tasks: ICrudGateway.of(TaskSchema).pick("create") });

export const Tasks = createWidget({ inject: props, draw: () => null });
export const given: GivenProps<typeof props> = { tasks: new ReadsOnly() };
