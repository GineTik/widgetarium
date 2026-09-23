function crashNotice(h, failure) {
	return h("div", { className: "wg-error" }, [
		h("b", { key: "what" }, "Widget crashed"),
		h("code", { key: "why" }, String(failure?.message ?? failure)),
	]);
}

export function crashBoundary(h, Component) {
	return class CrashBoundary extends Component {
		state = { failure: null };

		static getDerivedStateFromError(failure) {
			console.error("Widgetarium: widget crashed", failure);
			return { failure };
		}

		render() {
			if (!this.state.failure) return this.props.children;
			return crashNotice(h, this.state.failure);
		}
	};
}
