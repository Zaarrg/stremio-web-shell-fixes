declare const useSync: (token: string) => {
    isHost: boolean,
    isPause: boolean,
    limitOther: boolean,
    status: 'disconnected' | 'connecting' | 'connected' | 'error',
    networkDelay: number,
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
