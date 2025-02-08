declare const useSync: (token: string) => {
    isHost: boolean,
    limitOther: boolean,
    status: 'disconnected' | 'connecting' | 'connected' | 'error',
    roomId: string | null,
    latestMessage: any,
    messages: any[],
    connectAsHost: () => void,
    connectAsMember: (roomId: string) => void,
    sendMessage: (msgObj: any) => void,
    sendSeek: (seekTime: number) => void,
    sendPause: () => void,
    sendUnpause: () => void,
    disconnect: () => void,
};

export = useSync;
