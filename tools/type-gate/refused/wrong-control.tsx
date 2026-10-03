import { IValueGateway, createWidget, defineMetadata, z } from "widgetarium";

const Paged = createWidget({
	inject: { pageSize: IValueGateway.of(z.number().default(10)).pick("get") },
	draw: () => null,
});

export const metadata = defineMetadata(Paged, {
	title: "Wrong control",
	description: "A number drawn as an icon.",
	props: { pageSize: { control: "icon" } },
});
