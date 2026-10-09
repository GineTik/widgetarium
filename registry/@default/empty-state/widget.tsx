import { INavigator, IQuery, createWidget, defineLayout, defineMetadata } from "widgetarium";
import { z } from "zod";
import { Button, EmptyState } from "widgetarium/kit";

const SHAPES = ["cookie9-sided", "circle", "flower", "clover4-leaf", "soft-burst", "pentagon", "heart"] as const;

const TONES = ["purple", "pink", "orange", "yellow", "green", "cyan", "blue", "red"] as const;

const EmptyStateWidget = createWidget({
	inject: {
		getTitle: IQuery.output(z.string().default("Nothing here yet")),
		getText: IQuery.output(z.string().default("What appears here, and how it gets here.")),
		getShape: IQuery.output(z.enum(SHAPES).default("cookie9-sided")),
		getTone: IQuery.output(z.enum(TONES).default("purple")),
		getAction: IQuery.output(z.string().default("")),
		getLink: IQuery.output(z.string().default("")),
		navigator: INavigator,
	},
	draw: ({
		getTitle: title,
		getText: text,
		getShape: shape,
		getTone: tone,
		getAction: action,
		getLink: link,
		navigator,
	}) => (
		<EmptyState
			title={title}
			text={text}
			shape={shape}
			tones={[tone, tone === "purple" ? "pink" : "purple"]}
			action={action && link ? <Button onClick={() => navigator.navigate(link)}>{action}</Button> : null}
		/>
	),
});

export const metadata = defineMetadata(EmptyStateWidget, {
	title: "Empty state",
	description:
		"What a person sees where nothing is yet: a cluster of 3D shapes, a title, one line and the one action that fills it.",
	keywords: ["empty", "empty state", "nothing", "placeholder", "zero", "blank", "illustration", "shapes", "first run"],
	preview: {
		size: { w: 6, h: 4 },
		props: { getTitle: { value: "No news yet" }, getText: { value: "Deals appear here, newest first." } },
	},
	props: {
		getTitle: { hint: "What is missing, in a few words." },
		getText: { hint: "What will appear here and how it gets here." },
		getShape: { hint: "The large shape in the middle." },
		getTone: { hint: "The colour of the shapes." },
		getAction: { hint: "The label of the one action. Left empty, no button is drawn." },
		getLink: { hint: "The note the action opens." },
	},
});

export const layout = defineLayout({ role: "detail", size: { preferredWidth: "full", preferredHeight: "auto" } });

export default EmptyStateWidget;
