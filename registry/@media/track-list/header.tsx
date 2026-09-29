import { Row, RowLabel, RowValue } from "widgetarium/kit";

const TITLE_COLUMN = "Title";
const ALBUM_COLUMN = "Album";
const ADDED_COLUMN = "Added";
const TIME_COLUMN = "Time";

export function Header() {
	return (
		<Row className="mt-head">
			<span className="mt-index" aria-hidden="true" />
			<RowLabel className="mt-title">{TITLE_COLUMN}</RowLabel>
			<RowValue className="mt-col mt-col-album">{ALBUM_COLUMN}</RowValue>
			<RowValue className="mt-col mt-col-added">{ADDED_COLUMN}</RowValue>
			<RowValue className="mt-col mt-col-fav" aria-hidden="true" />
			<RowValue className="mt-col mt-col-time">{TIME_COLUMN}</RowValue>
		</Row>
	);
}
