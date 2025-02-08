const React = require('react');

const WS_URL = process.env.SYNC_WS;

const useSync = (token) => {
    const [status, setStatus] = React.useState('disconnected');
    const [roomId, setRoomId] = React.useState(null);
    const [messages, setMessages] = React.useState([]);
    const [latestMessage, setLatestMessage] = React.useState(null);
    const [limitOther, setLimitOther] = React.useState(false);
    const [isHost, setHost] = React.useState(false);
    const wsRef = React.useRef(null);

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

        setStatus('connecting');
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
            setStatus('connected');

            // Send the initial message.
            if (action === 'create') {
                ws.send(JSON.stringify({ action: 'create', token }));
            } else if (action === 'join') {
                ws.send(JSON.stringify({ action: 'join', token, room_id: joinRoomId }));
            }
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setLatestMessage(data);
                setMessages((prev) => [...prev, data]);
                // When the server responds with a room ID (for create or join), store it.
                switch (data.action) {
                    case 'room_joined':
                    case 'room_created':
                        setRoomId(data.room_id);
                        setHost(data.action === 'room_created');
                        break;
                    case 'new_host':
                        setHost(true);
                        break;
                    case 'limit_changed': {
                        const newState = data.payload === 'on';
                        setLimitOther(newState);
                        break;
                    }
                }
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
        (msgObj) => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify(msgObj));
            }
        },
        [token]
    );

    // Specific helper functions to send commands:
    const sendSeek = React.useCallback(
        (seekTime) => {
            const payload = `${seekTime}|${Date.now()}`;
            sendMessage({ action: 'seek', payload });
        },
        [sendMessage]
    );

    const sendPause = React.useCallback(() => {
        sendMessage({ action: 'pause', payload: 'pause' });
    }, [sendMessage]);

    const sendUnpause = React.useCallback(() => {
        sendMessage({ action: 'pause_no', payload: 'unpause' });
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
        roomId,
        latestMessage,
        messages,
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
