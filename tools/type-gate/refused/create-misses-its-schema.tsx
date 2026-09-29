import { ICrudGateway, createWidget, defineProps, z } from "widgetarium";

const TaskSchema = z.object({ title: z.string(), done: z.boolean().optional() });
const NewTaskSchema = z.object({ title: z.string() });

const props = defineProps({ tasks: ICrudGateway.of({ create: NewTaskSchema, other: TaskSchema }).pick("create") });

export default createWidget({
	inject: props,
	draw: ({ tasks }) => {
		tasks.create({});
		return null;
	},
});
