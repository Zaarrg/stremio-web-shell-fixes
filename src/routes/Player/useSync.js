const React = require('react');

const WS_URL = process.env.SYNC_WS;

const useSync = (token) => {
    const [status, setStatus] = React.useState('disconnected');
    const [roomId, setRoomId] = React.useState(null);
    const [latestMessage, setLatestMessage] = React.useState(null);
    const [limitOther, setLimitOther] = React.useState(false);
    const [isHost, setHost] = React.useState(false);
    const [networkDelay, setNetworkDelay] = React.useState(100);
    const wsRef = React.useRef(null);
    const pingIntervalRef = React.useRef(null);

    // Internal function to connect given an action ("create" or "join") and (optionally) a room ID.
    const connect = React.useCallback((action, joinRoomId = null) => {
        if (!token) {
            console.error('Token is required to connect');
            return;
        }

        // Close any existing connection first.
        if (wsRef.current) {
            wsRef.current.close();
        }
        //Todo some message because its not a queue sytem are ignored - e.g inital join seek and pause
        //Todo writetext cliboard not work on laptop

        setStatus('connecting');
        console.log('Connecting websocket')
        console.log(WS_URL)
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('Connected websocket')
            // Start ping-pong
            pingIntervalRef.current = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    // Send a ping with the current timestamp.
                    ws.send(`ping,${Date.now()}`);
                }
            }, 1000);

            // Send the initial message.
            if (action === 'create') {
                ws.send(`create,${token}`);
            } else if (action === 'join') {
                ws.send(`join,${token},${joinRoomId.replace(/\s/g, '')}`);
            }
        };

        ws.onmessage = (event) => {
            try {
                const msgStr = event.data;
                const parts = msgStr.split(',');
                if (parts.length < 2) {
                    console.error('Invalid message received:', msgStr);
                    return;
                }
                const message = {
                    action: parts[0],
                    payload: parts[1],
                };
                // When the server responds with a room ID (for create or join), store it.
                switch (message.action) {
                    case 'room_joined':
                    case 'room_created':
                        setRoomId(message.payload);
                        setHost(message.action === 'room_created');
                        setStatus('connected');
                        break;
                    case 'new_host':
                        setHost(true);
                        break;
                    case 'limit_changed': {
                        const newState = message.payload === 'on';
                        setLimitOther(newState);
                        break;
                    }
                    case 'pong': {
                        const sentTimestamp = parseInt(message.payload, 10);
                        const rtt = Date.now() - sentTimestamp;
                        const latency = rtt / 2;
                        setNetworkDelay(latency);
                        break;
                    }
                    case 'error':
                        setStatus('error');
                        break;
                }
                setLatestMessage(message);
            } catch (err) {
                console.error('Failed to parse incoming message:', err);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            setStatus('error');
        };

        ws.onclose = () => {
            setStatus('disconnected');
            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
                pingIntervalRef.current = null;
            }
        };
    }, [token]);

    // Exposed functions for UI events:
    const connectAsHost = React.useCallback(() => {
        connect('create');
    }, [connect]);

    const connectAsMember = React.useCallback((roomId) => {
        connect('join', roomId);
    }, [connect]);

    // Helper to send an arbitrary message (always includes the token).
    const sendMessage = React.useCallback(
        (msg) => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(msg);
            }
        },
        [token]
    );

    // Specific helper functions to send commands:
    const sendSeek = React.useCallback(
        (seekTime) => {
            sendMessage(`seek,${seekTime}:${networkDelay}`);
        },
        [sendMessage, networkDelay]
    );

    const sendPause = React.useCallback(() => {
        sendMessage('pause,pause');
    }, [sendMessage]);

    const sendUnpause = React.useCallback(() => {
        sendMessage('pause_no,unpause');
    }, [sendMessage]);

    const disconnect = React.useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    }, []);

    return {
        isHost,
        limitOther,
        status,
        networkDelay,
        roomId,
        latestMessage,
        connectAsHost,
        connectAsMember,
        sendMessage,
        sendSeek,
        sendPause,
        sendUnpause,
        disconnect,
    };
};

module.exports = useSync;
