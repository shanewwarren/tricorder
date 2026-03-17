import { create } from "zustand";

interface SessionStreamState {
	streams: Record<
		string,
		{
			messages: any[];
			connected: boolean;
			lastSeenIndex: number;
		}
	>;
	addMessage: (sessionId: string, message: any) => void;
	setConnected: (sessionId: string, connected: boolean) => void;
	initStream: (sessionId: string) => void;
	clearStream: (sessionId: string) => void;
}

export const useStreamStore = create<SessionStreamState>((set) => ({
	streams: {},
	initStream: (sessionId) =>
		set((state) => ({
			streams: {
				...state.streams,
				[sessionId]: { messages: [], connected: false, lastSeenIndex: 0 },
			},
		})),
	addMessage: (sessionId, message) =>
		set((state) => {
			const stream = state.streams[sessionId];
			if (!stream) return state;
			return {
				streams: {
					...state.streams,
					[sessionId]: {
						...stream,
						messages: [...stream.messages, message],
						lastSeenIndex: message.index + 1,
					},
				},
			};
		}),
	setConnected: (sessionId, connected) =>
		set((state) => {
			const stream = state.streams[sessionId];
			if (!stream) return state;
			return {
				streams: { ...state.streams, [sessionId]: { ...stream, connected } },
			};
		}),
	clearStream: (sessionId) =>
		set((state) => {
			const { [sessionId]: _, ...rest } = state.streams;
			return { streams: rest };
		}),
}));
