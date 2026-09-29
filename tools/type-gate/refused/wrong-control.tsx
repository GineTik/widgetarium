import { IValueGateway, defineMetadata, defineProps, z } from "widgetarium";

const props = defineProps({
	pageSize: IValueGateway.of(z.number().default(10)).pick("get"),
});

export const metadata = defineMetadata(props, {
	title: "Wrong control",
	description: "A number drawn as an icon.",
	props: { pageSize: { control: "icon" } },
});
