import {
	INavigator,
	IQuery,
	VaultRecordSchema,
	createWidget,
	defineLayout,
	defineMetadata,
	useData,
	z,
} from "widgetarium";
import { EmptyState, PhotoCard } from "widgetarium/kit";

const CardSchema = VaultRecordSchema.extend({
	title: z.string().meta({ aka: ["name"] }),
	subtitle: z
		.string()
		.optional()
		.meta({ aka: ["role", "description"] }),
	meta: z
		.string()
		.optional()
		.meta({ aka: ["date", "where"] }),
	photo: z
		.string()
		.optional()
		.meta({ aka: ["image", "cover", "picture"] }),
	badge: z
		.string()
		.optional()
		.meta({ aka: ["tag", "kind", "area"] }),
	link: z
		.string()
		.optional()
		.meta({ aka: ["url", "note"] }),
});

const CARDS_AT_MOST = 24;

const PhotoCards = createWidget({
	inject: {
		getCards: IQuery.expects(z.array(CardSchema)),
		getShape: IQuery.expects(z.enum(["wide", "tall", "square"]).default("wide")),
		getTextOnPhoto: IQuery.expects(z.boolean().default(false)),
		getColumns: IQuery.expects(z.number().default(3)),
		navigator: INavigator,
	},
	draw: ({ getCards, getShape: shape, getTextOnPhoto: isTextOnPhoto, getColumns: columns, navigator }) => {
		const { data: cards } = useData(getCards, { limit: CARDS_AT_MOST });
		if (!cards || cards.length === 0)
			return <EmptyState title="No cards yet" text="Each record in the folder becomes a card here." isCompact />;
		return (
			<div
				style={{
					display: "grid",
					gap: "20px",
					gridTemplateColumns: `repeat(${Math.max(1, Math.round(columns))}, minmax(0, 1fr))`,
				}}
			>
				{cards.map((card) => (
					<PhotoCard
						key={card.ref}
						title={card.title}
						subtitle={card.subtitle}
						meta={card.meta}
						photo={card.photo}
						badge={card.badge}
						shape={shape}
						isTextOnPhoto={isTextOnPhoto}
						onOpen={card.link ? () => navigator.navigate(card.link ?? "") : undefined}
					/>
				))}
			</div>
		);
	},
});

export const metadata = defineMetadata(PhotoCards, {
	title: "Photo cards",
	description:
		"Records as cards, each led by its photo — or a 3D shape when it has none — with a frosted badge and a round button that opens it.",
	keywords: ["cards", "photos", "gallery", "people", "team", "news", "grid", "records", "profiles", "articles"],
	preview: { size: { w: 12, h: 5 } },
	props: {
		getCards: {
			describes: {
				title: { label: "Title", type: "line" },
				subtitle: { label: "Line under it", type: "line" },
				meta: { label: "Small grey line", type: "line" },
				photo: { label: "Photo address", type: "line" },
				badge: { label: "Badge", type: "line" },
				link: { label: "Opens", type: "line" },
			},
			hint: "The records drawn as cards.",
		},
		getShape: { hint: "Wide for places and news, tall for people, square for things." },
		getTextOnPhoto: { hint: "Write the title on the photo instead of under it." },
		getColumns: { hint: "How many cards stand side by side." },
	},
});

export const layout = defineLayout({ role: "collection", size: { preferredWidth: "full", preferredHeight: "auto" } });

export default PhotoCards;
