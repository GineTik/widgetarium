// CONTEXT: a host with nowhere to go still answers — a widget never checks whether it HAS a
// navigator, only whether it may use one
export const NOWHERE = {
	canNavigate: false,
	resolve: () => null,
	navigate: () => false,
};
