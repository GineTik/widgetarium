import { ICrudGateway, createWidget, z } from "widgetarium";

const TaskSchema = z.object({ title: z.string(), done: z.boolean().optional() });
const NewTaskSchema = z.object({ title: z.string() });

export default createWidget({
	inject: { tasks: ICrudGateway.of({ create: NewTaskSchema, other: TaskSchema }).pick("create") },
	draw: ({ tasks }) => {
		tasks.create({});
		return null;
	},
});
