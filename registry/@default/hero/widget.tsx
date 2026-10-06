import { INavigator, IQuery, createWidget, defineLayout, defineMetadata, defineStates, z } from "widgetarium";
import { Button, Hero, Icon, PhotoStack } from "widgetarium/kit";

const TONES = ["purple", "pink", "orange", "yellow", "green", "cyan", "blue", "red"] as const;

const HeroWidget = createWidget({
	inject: {
		getTitle: IQuery.expects(z.string().default("Welcome")),
		getEyebrow: IQuery.expects(z.string().default("")),
		getText: IQuery.expects(z.string().default("")),
		getPhoto: IQuery.expects(z.string().default("")),
		getTone: IQuery.expects(z.enum(TONES).default("purple")),
		getAction: IQuery.expects(z.string().default("")),
		getLink: IQuery.expects(z.string().default("")),
		getFaces: IQuery.expects(z.array(z.string()).default([])),
		navigator: INavigator,
	},
	draw: ({
		getTitle: title,
		getEyebrow: eyebrow,
		getText: text,
		getPhoto: photo,
		getTone: tone,
		getAction: action,
		getLink: link,
		getFaces: faces,
		navigator,
	}) => (
		<Hero
			title={title}
			eyebrow={eyebrow || undefined}
			text={text || undefined}
			photo={photo || undefined}
			tones={[tone, tone === "purple" ? "pink" : "purple"]}
			action={
				action && link ? (
					<Button onClick={() => navigator.navigate(link)}>
						{action}
						<Icon name="arrow-right" />
					</Button>
				) : null
			}
			corner={faces.length > 0 ? <PhotoStack photos={faces.slice(0, 4)} size={44} isRound /> : null}
		/>
	),
});

export const states = defineStates(HeroWidget, {
	Full: {
		getEyebrow: "Tue 6 Oct",
		getTitle: "7 people overdue",
		getText: "Daniel Okafor waits longest: 96 days late",
		getTone: "green",
		getAction: "Open Daniel Okafor",
		getLink: "People/Daniel Okafor",
		getFaces: ["https://randomuser.me/api/portraits/men/32.jpg", "https://randomuser.me/api/portraits/women/44.jpg"],
	},
	Photo: {
		getTitle: "Weekend in Lisbon",
		getText: "Three days, two friends, one list",
		getPhoto: "https://images.unsplash.com/photo-1513735492246-483525079686?w=1600",
	},
	Plain: { getTitle: "Welcome" },
});

export const metadata = defineMetadata(HeroWidget, {
	title: "Hero",
	description:
		"The one large opening of a page: a photo with the title on a dark fade, or 3D shapes when there is no photo, and one action.",
	keywords: ["hero", "banner", "header", "welcome", "cover", "title", "intro", "photo", "landing"],
	preview: {
		size: { w: 12, h: 4 },
		props: { getTitle: { value: "Welcome to the team" }, getEyebrow: { value: "Handbook" } },
	},
	props: {
		getTitle: { hint: "The page's one display title." },
		getEyebrow: { hint: "A small line above the title." },
		getText: { hint: "One or two lines under the title." },
		getPhoto: { hint: "An https address of the photo. Left empty, 3D shapes stand in its place." },
		getTone: { hint: "The colour of the shapes when there is no photo." },
		getAction: { hint: "The label of the one action. Left empty, no button is drawn." },
		getLink: { hint: "The note the action opens." },
		getFaces: { hint: "Up to four faces, https addresses, stacked in the corner." },
	},
});

export const layout = defineLayout({ role: "layout", size: { preferredWidth: "full", preferredHeight: 340 } });

export default HeroWidget;
