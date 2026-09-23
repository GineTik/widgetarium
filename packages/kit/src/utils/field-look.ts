const FIELD_LOOK = ["size", "block", "className"];

export function withoutFieldLook(props) {
	const behaviour = { ...props };
	for (const name of FIELD_LOOK) delete behaviour[name];
	return behaviour;
}
