import {
	ICommand,
	IQuery,
	RecordRefSchema,
	VaultRecordSchema,
	createWidget,
	defineLayout,
	defineMetadata,
	useData,
	z,
} from "widgetarium";
import { Icon } from "widgetarium/kit";
import { Cover } from "./cover";
import { Deck } from "./deck";
import { queueOf } from "./queue-of";
import { REPEAT_MODES } from "./repeat";
import { SeekBar } from "./seek-bar";
import { steeringOf } from "./steering-of";
import { CSS } from "./style";
import { textIn } from "./text-in";
import { TrackHead } from "./track-head";

const QUEUE_CEILING = 300;

const EMPTY_QUEUE = "No tracks are bound yet — bind a folder of audio notes and the player draws what stands in it.";

const TrackSchema = VaultRecordSchema.extend({
	title: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["track", "song", "heading"] }),
	artist: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["performer", "band", "author", "by"] }),
	album: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["release", "record"] }),
	cover: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["art", "artwork", "image", "thumbnail", "picture"] }),
	duration: z
		.union([z.number(), z.string()])
		.nullable()
		.optional()
		.meta({ aka: ["length", "runtime", "seconds"] }),
	favourite: z
		.boolean()
		.nullable()
		.optional()
		.meta({ aka: ["favorite", "loved", "starred", "liked"] }),
});

export type Track = z.infer<typeof TrackSchema>;

export const PlayerWidget = createWidget({
	inject: {
		getTracks: IQuery.expects(z.array(TrackSchema)),
		updateTrack: ICommand.sends(TrackSchema.partial().extend({ ref: RecordRefSchema })),
		getPlaying: IQuery.expects(z.unknown().default("")),
		setPlaying: ICommand.sends(z.unknown()),
		getIsPlaying: IQuery.expects(z.boolean().default(false)),
		setIsPlaying: ICommand.sends(z.boolean()),
		getPosition: IQuery.expects(z.number().default(0)),
		setPosition: ICommand.sends(z.number()),
		getVolume: IQuery.expects(z.number().default(70)),
		setVolume: ICommand.sends(z.number()),
		getIsShuffled: IQuery.expects(z.boolean().default(false)),
		setIsShuffled: ICommand.sends(z.boolean()),
		getRepeat: IQuery.expects(z.enum(REPEAT_MODES).default("off")),
		setRepeat: ICommand.sends(z.enum(REPEAT_MODES)),
	},
	draw: ({
		getTracks,
		updateTrack,
		getPlaying: playing,
		setPlaying,
		getIsPlaying: isPlaying,
		setIsPlaying,
		getPosition: position,
		setPosition,
		getVolume: volume,
		setVolume,
		getIsShuffled: isShuffled,
		setIsShuffled,
		getRepeat: repeat,
		setRepeat,
	}) => {
		const listed = useData(getTracks, { limit: QUEUE_CEILING });
		const queue = queueOf(listed.data, playing, position, repeat);
		const { rows, track, duration, elapsed } = queue;
		const canSteer = setPlaying.can().can && rows.length > 0;

		const steering = steeringOf(queue, { setPlaying, setPosition, isPlaying, setIsPlaying, isShuffled });

		if (!listed.isLoading && rows.length === 0)
			return (
				<div className="wgm-none">
					<style>{CSS}</style>
					<Icon name="list-music" size={20} />
					<p className="wgm-none-line">{listed.failure ?? EMPTY_QUEUE}</p>
				</div>
			);

		return (
			<div className="wgm-player">
				<style>{CSS}</style>

				<Cover key={textIn(track?.cover) ?? "none"} picture={textIn(track?.cover)} />

				<div className="wgm-body">
					<TrackHead track={track} updateTrack={updateTrack} />

					<Deck
						isShuffled={isShuffled}
						setIsShuffled={setIsShuffled}
						isPlaying={isPlaying}
						repeat={repeat}
						setRepeat={setRepeat}
						volume={volume}
						setVolume={setVolume}
						canSteer={canSteer}
						steering={steering}
					/>

					<SeekBar hasTrack={track !== null} elapsed={elapsed} duration={duration} setPosition={setPosition} />
				</div>
			</div>
		);
	},
});

export const metadata = defineMetadata(PlayerWidget, {
	title: "Player",
	description: "The track playing now, with its cover, its transport and the queue it steps through.",
	keywords: [
		"player",
		"audio",
		"music",
		"track",
		"song",
		"playlist",
		"queue",
		"transport",
		"play",
		"pause",
		"seek",
		"shuffle",
		"repeat",
		"volume",
		"favourite",
		"podcast",
	],
	preview: {
		size: { w: 6, h: 2 },
		props: {
			getTracks: {
				rows: [
					{ path: "Music/Riverbed.md", name: "Riverbed", artist: "Hana Okabe", duration: 231, favourite: true },
					{ path: "Music/Low Tide.md", name: "Low Tide", artist: "Hana Okabe", duration: 198 },
					{ path: "Music/Glasshouse.md", name: "Glasshouse", artist: "Vera Nilsen", duration: 274 },
				],
			},
			getPlaying: { value: "i0" },
			getIsPlaying: { value: true },
			getPosition: { value: 74 },
			getVolume: { value: 70 },
		},
	},
	props: {
		getTracks: {
			label: "Tracks",
			aka: ["tracks"],
			hint: "The queue. One note per track, in the order the bound folder is sorted.",
			describes: {
				title: { label: "Title", type: "text" },
				artist: { label: "Artist", type: "text" },
				album: { label: "Album", type: "text" },
				cover: { label: "Cover", type: "text" },
				duration: { label: "Duration", type: "number" },
				favourite: { label: "Favourite", type: "boolean" },
			},
		},
		updateTrack: {
			label: "Change a track",
			hint: "Runs when the favourite is pressed, with the track and its new favourite.",
			source: { implementation: "@core/rows-update", fields: { target: "getTracks" } },
		},
		getPlaying: {
			label: "Playing",
			aka: ["playing"],
			hint: "Which track is loaded. Bind a queue beside it and the two move together.",
			source: { implementation: "@core/selection", fields: { rows: "getTracks" } },
		},
		setPlaying: {
			label: "Load a track",
			hint: "Runs when the transport steps to another track, with the track it steps to.",
			source: { implementation: "@core/value-set", fields: { target: "getPlaying" } },
		},
		getIsPlaying: {
			keep: "screen",
			label: "Playing state",
			aka: ["isPlaying"],
			hint: "Whether the transport stands at play or at pause.",
		},
		setIsPlaying: {
			label: "Play or pause",
			hint: "Runs when play or pause is pressed, or the queue ends, with whether it now plays.",
			source: { implementation: "@core/value-set", fields: { target: "getIsPlaying" } },
		},
		getPosition: {
			keep: "screen",
			label: "Position",
			aka: ["position"],
			hint: "How far into the track the transport stands, in seconds.",
		},
		setPosition: {
			label: "Seek",
			hint: "Runs when the seek bar is moved or a track starts again, with the second it now stands at.",
			source: { implementation: "@core/value-set", fields: { target: "getPosition" } },
		},
		getVolume: {
			keep: "screen",
			label: "Volume",
			aka: ["volume"],
			hint: "The level the transport is set to, from nothing to full.",
		},
		setVolume: {
			label: "Set the volume",
			hint: "Runs when the volume bar is moved, with the new level.",
			source: { implementation: "@core/value-set", fields: { target: "getVolume" } },
		},
		getIsShuffled: {
			keep: "screen",
			label: "Shuffle",
			aka: ["isShuffled"],
			hint: "Whether the next track is the one after this or one drawn at random.",
		},
		setIsShuffled: {
			label: "Shuffle or play in order",
			hint: "Runs when shuffle is pressed, with whether the queue is now shuffled.",
			source: { implementation: "@core/value-set", fields: { target: "getIsShuffled" } },
		},
		getRepeat: {
			keep: "screen",
			label: "Repeat",
			aka: ["repeat"],
			hint: "What the end of the queue does.",
			options: [
				{ value: "off", label: "Stop" },
				{ value: "all", label: "Start the queue again" },
				{ value: "one", label: "Hold on this track" },
			],
		},
		setRepeat: {
			label: "Change the repeat",
			hint: "Runs when repeat is pressed, with what the end of the queue now does.",
			source: { implementation: "@core/value-set", fields: { target: "getRepeat" } },
		},
	},
});

export const layout = defineLayout({
	role: "composer",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 240, stackBelowPx: 280 },
});

export default PlayerWidget;
