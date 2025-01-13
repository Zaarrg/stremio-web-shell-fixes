const EventEmitter = require('eventemitter3');

let shellAvailable = false;
const shellEvents = new EventEmitter();

if (window.chrome && window.chrome.webview) {
    window.initShellComm = function () {
        delete window.initShellComm;
        shellEvents.emit('availabilityChanged');
    };
}

const initialize = () => {
    if(!window.chrome || !window.chrome.webview) return Promise.reject('Qt API not found');
    return new Promise((resolve) => {
        function onShellAvailabilityChanged() {
            shellEvents.off('availabilityChanged', onShellAvailabilityChanged);
            shellAvailable = true;
            window.qt = function () { console.error('This is fake its really Webview'); };
            resolve();
        }
        if (shellAvailable) {
            onShellAvailabilityChanged();
        } else {
            shellEvents.on('availabilityChanged', onShellAvailabilityChanged);
        }
    });
};

const showDialogWhenExists = () => {
    const dialog = document.getElementById('update-dialog');
    if (dialog) {
        dialog.style.display = 'flex';
    } else {
        setTimeout(showDialogWhenExists, 100);
    }
};

function WebViewTransport() {
    const events = new EventEmitter();

    this.props = {};

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const shell = this;

    initialize()
        .then(() => {
            const transport = {};

            let msgId = 0;
            transport.send = function (ev, args) {
                const msg = {
                    id: msgId++,
                    event: ev,
                    args: args || [],
                };
                window.chrome.webview.postMessage(JSON.stringify(msg));
            };

            shell.send = function (ev, args) {
                transport.send(ev, args);
            };

            window.chrome.webview.addEventListener('message', (e) => {
                const nativeMsg = e.data;

                if (nativeMsg && typeof nativeMsg === 'object') {
                    if (nativeMsg.type === 'shellVersion') {
                        shell.props.shellVersion = nativeMsg.value;
                        if (typeof nativeMsg.value === 'string') {
                            shell.shellVersionArr = (
                                nativeMsg.value.match(/(\d+)\.(\d+)\.(\d+)/) || []
                            )
                                .slice(1, 4)
                                .map(Number);
                        }
                        events.emit('received-props', shell.props);
                    } else if (nativeMsg.type === 'requestUpdate') {
                        showDialogWhenExists();
                    } else if (nativeMsg.type === 'showPictureInPicture') {
                        const pipOverlay = document.getElementById('pip-overlay');
                        if (pipOverlay) pipOverlay.style.display = 'block';
                    } else if (nativeMsg.type === 'hidePictureInPicture') {
                        const pipOverlay = document.getElementById('pip-overlay');
                        if (pipOverlay) pipOverlay.style.display = 'none';
                    }
                    else {
                        events.emit(nativeMsg.type, nativeMsg);
                    }
                }
            });

            shell.send('app-ready', {});
            events.emit('init');
        })
        .catch((error) => {
            events.emit('init-error', error);
        });

    // standard event methods
    this.on = function (name, listener) {
        events.on(name, listener);
    };
    this.off = function (name, listener) {
        events.off(name, listener);
    };
    this.removeAllListeners = function () {
        events.removeAllListeners();
    };
}

module.exports = WebViewTransport;
