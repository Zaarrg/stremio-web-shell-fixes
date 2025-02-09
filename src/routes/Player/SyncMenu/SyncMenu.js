// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const classNames = require('classnames');
const PropTypes = require('prop-types');
const styles = require('./styles.less');
const {useToast} = require('stremio/common');

const SyncMenu = ({
    className,
    status,
    isHost,
    roomId,
    connectAsHost,
    connectAsMember,
    disconnect,
    sendMessage,
    limitOther,
    buffer,
}) => {
    const [joinRoomInput, setJoinRoomInput] = React.useState('');
    const toast = useToast();

    // Returns a CSS class name based on connection status.
    const getStatusClass = (status) => {
        switch (status) {
            case 'connected':
                return 'status-dot-connected';
            case 'connecting':
                return 'status-dot-connecting';
            case 'error':
                return 'status-dot-error';
            case 'disconnected':
            default:
                return 'status-dot-disconnected';
        }
    };

    // Handle copying the room ID to clipboard.
    const handleCopyRoomId = () => {
        if (roomId) {
            navigator.clipboard.writeText(roomId).then(() => {
                toast.show({
                    type: 'success',
                    title: 'Syncing Copy',
                    message: 'Room ID copied!',
                    timeout: 3000
                });
            });
        }
    };

    const onMouseDown = React.useCallback((event) => {
        event.nativeEvent.syncMenuClosePrevented = true;
    }, []);

    return (
        <div className={classNames(className, styles['sync-menu-container'])} onMouseDown={onMouseDown}>
            <div className={styles['sync-menu-header']}>
                <h3>Sync</h3>

                <div className={styles['sync-status']}>
                    <span className={classNames(styles['status-dot'], styles[getStatusClass(status)])}/>
                    <span className={styles['status-text']}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                        { status === 'connected' && ' - ' }
                        { status === 'connected' && buffer}
                        { status === 'connected' && 'ms'}
                    </span>
                </div>
            </div>

            {status !== 'connected' && (
                <div className={styles['sync-controls']}>
                    <div className={styles['join-room']}>
                        <input
                            type="text"
                            placeholder="Enter Room ID"
                            value={joinRoomInput}
                            onChange={(e) => setJoinRoomInput(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                        />
                        <button onClick={() => joinRoomInput && connectAsMember(joinRoomInput)}>
                            Join Room
                        </button>
                    </div>
                    <div className={styles['create-room']}>
                        <button onClick={connectAsHost}>Create Room</button>
                    </div>
                </div>
            )}

            {status === 'connected' && roomId && (
                <div className={styles['room-info']}>
                    <p className={styles['room-label']}>Room ID:</p>
                    <input type="text" readOnly value={roomId}/>
                    <div className={styles['room-buttons']}>
                        <button className={styles['copy-button']} onClick={handleCopyRoomId}>
                            Copy
                        </button>
                        <button className={styles['disconnect-button']} onClick={disconnect}>
                            Disconnect
                        </button>
                    </div>
                    {isHost && (
                        <div className={styles['limit-other']}>
                            <button
                                className={limitOther ? styles['active'] : ''}
                                onClick={() => {
                                    sendMessage(`limit,${!limitOther ? 'on' : 'off'}`);
                                }}
                            >
                                Host-Only Mode
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

SyncMenu.propTypes = {
    className: PropTypes.string,
    status: PropTypes.string,
    isHost: PropTypes.bool,
    limitOther: PropTypes.bool,
    roomId: PropTypes.string,
    connectAsHost: PropTypes.func,
    connectAsMember: PropTypes.func,
    disconnect: PropTypes.func,
    sendMessage: PropTypes.func,
    buffer: PropTypes.number
};

module.exports = SyncMenu;
