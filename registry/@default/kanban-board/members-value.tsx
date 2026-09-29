import { Avatar } from "./avatar";
import { Glyph } from "./glyph";

export function MembersValue({ held }: { held: string[] }) {
	return held.length === 0 ? (
		<span className="otd-value is-empty">Empty</span>
	) : (
		<span className="otd-value">
			<span className="otd-avatars">
				{held.map((person) => (
					<Avatar key={person} person={person} />
				))}
				<i className="otd-avatar otd-avatar-add">
					<Glyph name="plus" />
				</i>
			</span>
		</span>
	);
}
