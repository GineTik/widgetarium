import { Component } from "react";
import type { ReactNode } from "react";

export interface ContainedProps {
	readonly instead: (failure: unknown) => ReactNode;
	readonly children?: ReactNode;
}

interface ContainedState {
	readonly failure: unknown;
}

export class Contained extends Component<ContainedProps, ContainedState> {
	override state: ContainedState = { failure: null };

	override componentDidCatch(failure: unknown): void {
		this.setState({ failure });
	}

	override render(): ReactNode {
		return this.state.failure ? this.props.instead(this.state.failure) : this.props.children;
	}
}
