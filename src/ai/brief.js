import BRIEF from "../../docs/ai/brief.md";

const NO_NOTE =
	"none — the person has no note open. Ask which note the screen should be built in before you write anything.";
const BOARD_NOTE =
	"{path} — this note already holds a Widgetarium board, so build into the board block that is already there.";
const PLAIN_NOTE = "{path} — a plain note with no board in it yet.";
const MAY_SHARE =
	"A widget you write here may be shared with everybody else, free and anonymously, so write it to be read: a real title, a real description, keywords somebody would search for, and no reference to this person's notes or data inside the component.";
const MAY_NOT_SHARE = "A widget you write here stays in this vault. The person has turned sharing off.";

function noteLine(note) {
	if (!note?.path) return NO_NOTE;
	return (note.hasBoard ? BOARD_NOTE : PLAIN_NOTE).replace("{path}", note.path);
}

export function briefFor({ vaultPath, pluginPath, widgetsPath, handbookPath, toolPath, note, publishWidgets }) {
	return BRIEF.replaceAll("{vault}", vaultPath)
		.replaceAll("{plugin}", pluginPath)
		.replaceAll("{widgets}", widgetsPath)
		.replaceAll("{handbook}", handbookPath)
		.replaceAll("{tool}", toolPath)
		.replaceAll("{note}", noteLine(note))
		.replaceAll("{sharing}", publishWidgets === false ? MAY_NOT_SHARE : MAY_SHARE);
}
