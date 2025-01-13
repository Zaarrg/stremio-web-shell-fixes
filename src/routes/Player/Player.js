// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const debounce = require('lodash.debounce');
const langs = require('langs');
const { useTranslation } = require('react-i18next');
const { useRouteFocused } = require('stremio-router');
const { useServices } = require('stremio/services');
const { HorizontalNavBar, Transition, useFullscreen, useBinaryState, useToast, useStreamingServer, withCoreSuspender } = require('stremio/common');
const BufferingLoader = require('./BufferingLoader');
const VolumeChangeIndicator = require('./VolumeChangeIndicator');
const Error = require('./Error');
const ControlBar = require('./ControlBar');
const NextVideoPopup = require('./NextVideoPopup');
const StatisticsMenu = require('./StatisticsMenu');
const OptionsMenu = require('./OptionsMenu');
const SubtitlesMenu = require('./SubtitlesMenu');
const { default: AudioMenu } = require('./AudioMenu');
const SpeedMenu = require('./SpeedMenu');
const { default: SideDrawerButton } = require('./SideDrawerButton');
const { default: SideDrawer } = require('./SideDrawer');
const usePlayer = require('./usePlayer');
const useSettings = require('./useSettings');
const useStatistics = require('./useStatistics');
const useVideo = require('./useVideo');
const styles = require('./styles');
const Video = require('./Video');

const Player = ({ urlParams, queryParams }) => {
    const { t } = useTranslation();
    const { chromecast, shell, core } = useServices();
    const forceTranscoding = React.useMemo(() => {
        return queryParams.has('forceTranscoding');
    }, [queryParams]);

    const [player, videoParamsChanged, timeChanged, seek, pausedChanged, ended, nextVideo] = usePlayer(urlParams);
    const [settings, updateSettings] = useSettings();
    const streamingServer = useStreamingServer();
    const statistics = useStatistics(player, streamingServer);
    const video = useVideo();
    const routeFocused = useRouteFocused();
    const toast = useToast();

    const [seeking, setSeeking] = React.useState(false);

    const [casting, setCasting] = React.useState(() => {
        return chromecast.active && chromecast.transport.getCastState() === cast.framework.CastState.CONNECTED;
    });

    const [immersed, setImmersed] = React.useState(true);
    const setImmersedDebounced = React.useCallback(debounce(setImmersed, 3000), []);
    const [, , , toggleFullscreen] = useFullscreen();

    const [optionsMenuOpen, , closeOptionsMenu, toggleOptionsMenu] = useBinaryState(false);
    const [subtitlesMenuOpen, , closeSubtitlesMenu, toggleSubtitlesMenu] = useBinaryState(false);
    const [audioMenuOpen, , closeAudioMenu, toggleAudioMenu] = useBinaryState(false);
    const [speedMenuOpen, , closeSpeedMenu, toggleSpeedMenu] = useBinaryState(false);
    const [statisticsMenuOpen, , closeStatisticsMenu, toggleStatisticsMenu] = useBinaryState(false);
    const [nextVideoPopupOpen, openNextVideoPopup, closeNextVideoPopup] = useBinaryState(false);
    const [sideDrawerOpen, , closeSideDrawer, toggleSideDrawer] = useBinaryState(false);

    const menusOpen = React.useMemo(() => {
        return optionsMenuOpen || subtitlesMenuOpen || audioMenuOpen || speedMenuOpen || statisticsMenuOpen || sideDrawerOpen;
    }, [optionsMenuOpen, subtitlesMenuOpen, audioMenuOpen, speedMenuOpen, statisticsMenuOpen, sideDrawerOpen]);

    const closeMenus = React.useCallback(() => {
        closeOptionsMenu();
        closeSubtitlesMenu();
        closeAudioMenu();
        closeSpeedMenu();
        closeStatisticsMenu();
        closeSideDrawer();
    }, []);

    const overlayHidden = React.useMemo(() => {
        return immersed && !casting && video.state.paused !== null && !video.state.paused && !menusOpen && !nextVideoPopupOpen;
    }, [immersed, casting, video.state.paused, menusOpen, nextVideoPopupOpen]);

    const nextVideoPopupDismissed = React.useRef(false);
    const nextVideoInitialData = React.useRef(player.nextVideo);
    nextVideoInitialData.current = player.nextVideo;
    const defaultSubtitlesSelected = React.useRef(false);
    const defaultAudioTrackSelected = React.useRef(false);
    const [error, setError] = React.useState(null);

    const onImplementationChanged = React.useCallback(() => {
        video.setProp('subtitlesSize', settings.subtitlesSize);
        video.setProp('subtitlesOffset', settings.subtitlesOffset);
        video.setProp('subtitlesTextColor', settings.subtitlesTextColor);
        video.setProp('subtitlesBackgroundColor', settings.subtitlesBackgroundColor);
        video.setProp('subtitlesOutlineColor', settings.subtitlesOutlineColor);
        video.setProp('extraSubtitlesSize', settings.subtitlesSize);
        video.setProp('extraSubtitlesOffset', settings.subtitlesOffset);
        video.setProp('extraSubtitlesTextColor', settings.subtitlesTextColor);
        video.setProp('extraSubtitlesBackgroundColor', settings.subtitlesBackgroundColor);
        video.setProp('extraSubtitlesOutlineColor', settings.subtitlesOutlineColor);
    }, [settings.subtitlesSize, settings.subtitlesOffset, settings.subtitlesTextColor, settings.subtitlesBackgroundColor, settings.subtitlesOutlineColor]);

    const onEnded = React.useCallback(() => {
        player.nextVideo = nextVideoInitialData.current;
        if (player.nextVideo !== null) {
            onNextVideoRequested();
        } else {
            ended();
            window.history.back();
        }
    }, [player.nextVideo, onNextVideoRequested]);

    const onError = React.useCallback((error) => {
        console.error('Player', error);
        if (error.critical) {
            setError(error);
        } else {
            toast.show({
                type: 'error',
                title: t('ERROR'),
                message: error.message,
                timeout: 3000
            });
        }
    }, []);

    const onSubtitlesTrackLoaded = React.useCallback(() => {
        toast.show({
            type: 'success',
            title: t('PLAYER_SUBTITLES_LOADED'),
            message: t('PLAYER_SUBTITLES_LOADED_EMBEDDED'),
            timeout: 3000
        });
    }, []);

    const onExtraSubtitlesTrackLoaded = React.useCallback((track) => {
        toast.show({
            type: 'success',
            title: t('PLAYER_SUBTITLES_LOADED'),
            message: track.exclusive ? t('PLAYER_SUBTITLES_LOADED_EXCLUSIVE') : t('PLAYER_SUBTITLES_LOADED_ORIGIN', { origin: track.origin }),
            timeout: 3000
        });
    }, []);

    const onPlayRequested = React.useCallback(() => {
        video.setProp('paused', false);
        setSeeking(false);
    }, []);

    const onPlayRequestedDebounced = React.useCallback(debounce(onPlayRequested, 200), []);

    const onPauseRequested = React.useCallback(() => {
        video.setProp('paused', true);
    }, []);

    const onPauseRequestedDebounced = React.useCallback(debounce(onPauseRequested, 200), []);
    const onMuteRequested = React.useCallback(() => {
        video.setProp('muted', true);
    }, []);

    const onUnmuteRequested = React.useCallback(() => {
        video.setProp('muted', false);
    }, []);

    const onVolumeChangeRequested = React.useCallback((volume) => {
        video.setProp('volume', volume);
    }, []);

    const onSeekRequested = React.useCallback((time) => {
        video.setProp('time', time);
        seek(time, video.state.duration, video.state.manifest?.name);
    }, [video.state.duration, video.state.manifest]);

    const onPlaybackSpeedChanged = React.useCallback((rate) => {
        video.setProp('playbackSpeed', rate);
    }, []);

    const onSubtitlesTrackSelected = React.useCallback((id) => {
        video.setProp('selectedSubtitlesTrackId', id);
        video.setProp('selectedExtraSubtitlesTrackId', null);
    }, []);

    const onExtraSubtitlesTrackSelected = React.useCallback((id) => {
        video.setProp('selectedSubtitlesTrackId', null);
        video.setProp('selectedExtraSubtitlesTrackId', id);
    }, []);

    const onAudioTrackSelected = React.useCallback((id) => {
        video.setProp('selectedAudioTrackId', id);
    }, []);

    const onExtraSubtitlesDelayChanged = React.useCallback((delay) => {
        video.setProp('extraSubtitlesDelay', delay);
    }, []);

    const onSubtitlesSizeChanged = React.useCallback((size) => {
        updateSettings({ subtitlesSize: size });
    }, [updateSettings]);

    const onSubtitlesOffsetChanged = React.useCallback((offset) => {
        updateSettings({ subtitlesOffset: offset });
    }, [updateSettings]);

    const onDismissNextVideoPopup = React.useCallback(() => {
        closeNextVideoPopup();
        nextVideoPopupDismissed.current = true;
    }, []);

    const onNextVideoRequested = React.useCallback(() => {
        if (player.nextVideo !== null) {
            nextVideo();

            const deepLinks = player.nextVideo.deepLinks;
            if (deepLinks.metaDetailsStreams && deepLinks.player) {
                window.location.replace(deepLinks.metaDetailsStreams);
                window.location.href = deepLinks.player;
            } else {
                window.location.replace(deepLinks.player ?? deepLinks.metaDetailsStreams);
            }
        }
    }, [player.nextVideo]);

    const onVideoClick = React.useCallback(() => {
        if (video.state.paused !== null) {
            if (video.state.paused) {
                onPlayRequestedDebounced();
            } else {
                onPauseRequestedDebounced();
            }
        }
    }, [video.state.paused]);

    const onVideoDoubleClick = React.useCallback(() => {
        onPlayRequestedDebounced.cancel();
        onPauseRequestedDebounced.cancel();
        toggleFullscreen();
    }, [toggleFullscreen]);

    const onContainerMouseDown = React.useCallback((event) => {
        if (!event.nativeEvent.optionsMenuClosePrevented) {
            closeOptionsMenu();
        }
        if (!event.nativeEvent.subtitlesMenuClosePrevented) {
            closeSubtitlesMenu();
        }
        if (!event.nativeEvent.audioMenuClosePrevented) {
            closeAudioMenu();
        }
        if (!event.nativeEvent.speedMenuClosePrevented) {
            closeSpeedMenu();
        }
        if (!event.nativeEvent.statisticsMenuClosePrevented) {
            closeStatisticsMenu();
        }

        closeSideDrawer();
    }, []);

    const onContainerMouseMove = React.useCallback((event) => {
        setImmersed(false);
        if (!event.nativeEvent.immersePrevented) {
            setImmersedDebounced(true);
        } else {
            setImmersedDebounced.cancel();
        }
    }, []);

    const onContainerMouseLeave = React.useCallback(() => {
        setImmersedDebounced.cancel();
        setImmersed(true);
    }, []);

    const onBarMouseMove = React.useCallback((event) => {
        event.nativeEvent.immersePrevented = true;
    }, []);

    React.useEffect(() => {
        setError(null);
        video.unload();

        if (player.selected && streamingServer.settings?.type !== 'Loading') {
            video.load({
                stream: {
                    ...player.selected.stream,
                    subtitles: Array.isArray(player.selected.stream.subtitles) ?
                        player.selected.stream.subtitles.map((subtitles) => ({
                            ...subtitles,
                            label: subtitles.url
                        }))
                        :
                        []
                },
                autoplay: true,
                time: player.libraryItem !== null &&
                    player.selected.streamRequest !== null &&
                    player.selected.streamRequest.path !== null &&
                    player.libraryItem.state.video_id === player.selected.streamRequest.path.id ?
                    player.libraryItem.state.timeOffset
                    :
                    0,
                forceTranscoding: forceTranscoding || casting,
                maxAudioChannels: settings.surroundSound ? 32 : 2,
                streamingServerURL: streamingServer.baseUrl ?
                    casting ?
                        streamingServer.baseUrl
                        :
                        streamingServer.selected.transportUrl
                    :
                    null,
                seriesInfo: player.seriesInfo
            }, {
                chromecastTransport: chromecast.active ? chromecast.transport : null,
                shellTransport: shell.active ? shell.transport : null,
            });
        }
    }, [streamingServer.baseUrl, player.selected, forceTranscoding, casting]);
    React.useEffect(() => {
        if (video.state.stream !== null) {
            const tracks = player.subtitles.map((subtitles) => ({
                ...subtitles,
                label: subtitles.url
            }));
            video.addExtraSubtitlesTracks(tracks);
        }
    }, [player.subtitles, video.state.stream]);

    React.useEffect(() => {
        video.setProp('subtitlesSize', settings.subtitlesSize);
        video.setProp('extraSubtitlesSize', settings.subtitlesSize);
    }, [settings.subtitlesSize]);

    React.useEffect(() => {
        video.setProp('subtitlesOffset', settings.subtitlesOffset);
        video.setProp('extraSubtitlesOffset', settings.subtitlesOffset);
    }, [settings.subtitlesOffset]);

    React.useEffect(() => {
        video.setProp('subtitlesTextColor', settings.subtitlesTextColor);
        video.setProp('extraSubtitlesTextColor', settings.subtitlesTextColor);
    }, [settings.subtitlesTextColor]);

    React.useEffect(() => {
        video.setProp('subtitlesBackgroundColor', settings.subtitlesBackgroundColor);
        video.setProp('extraSubtitlesBackgroundColor', settings.subtitlesBackgroundColor);
    }, [settings.subtitlesBackgroundColor]);

    React.useEffect(() => {
        video.setProp('subtitlesOutlineColor', settings.subtitlesOutlineColor);
        video.setProp('extraSubtitlesOutlineColor', settings.subtitlesOutlineColor);
    }, [settings.subtitlesOutlineColor]);

    React.useEffect(() => {
        !seeking && timeChanged(video.state.time, video.state.duration, video.state.manifest?.name);
    }, [video.state.time, video.state.duration, video.state.manifest, seeking]);

    React.useEffect(() => {
        if (video.state.paused !== null) {
            pausedChanged(video.state.paused);
        }
    }, [video.state.paused]);

    React.useEffect(() => {
        videoParamsChanged(video.state.videoParams);
    }, [video.state.videoParams]);

    React.useEffect(() => {
        if (!!settings.bingeWatching && player.nextVideo !== null && !nextVideoPopupDismissed.current) {
            if (video.state.time !== null && video.state.duration !== null && video.state.time < video.state.duration && (video.state.duration - video.state.time) <= settings.nextVideoNotificationDuration) {
                openNextVideoPopup();
            } else {
                closeNextVideoPopup();
            }
        }
    }, [player.nextVideo, video.state.time, video.state.duration]);

    React.useEffect(() => {
        if (!defaultSubtitlesSelected.current) {
            if (video.state.extraSubtitlesTracks.length === 0 && video.state.subtitlesTracks.length === 0) return;

            const lastVideo = localStorage.getItem('lastVideo');
            const lastSubtitleId = localStorage.getItem('subtitleId');

            if (lastVideo === urlParams.id && lastSubtitleId) {
                const foundSubtitle = video.state.subtitlesTracks.find((track) => track.id === lastSubtitleId);
                const foundExtraSubtitle = video.state.extraSubtitlesTracks.find((track) => track.id === lastSubtitleId);

                if (foundSubtitle) {
                    onSubtitlesTrackSelected(lastSubtitleId);
                    defaultSubtitlesSelected.current = true;
                    return;
                } else if (foundExtraSubtitle) {
                    onExtraSubtitlesTrackSelected(lastSubtitleId);
                    defaultSubtitlesSelected.current = true;
                    return;
                }
            }
            const findTrackByLang = (tracks, lang) => tracks.find((track) => track.lang === lang || langs.where('1', track.lang)?.[2] === lang);

            const subtitlesTrack = findTrackByLang(video.state.subtitlesTracks, settings.subtitlesLanguage);
            const extraSubtitlesTrack = findTrackByLang(video.state.extraSubtitlesTracks, settings.subtitlesLanguage);

            if (subtitlesTrack && subtitlesTrack.id) {
                onSubtitlesTrackSelected(subtitlesTrack.id);
                defaultSubtitlesSelected.current = true;
            } else if (extraSubtitlesTrack && extraSubtitlesTrack.id) {
                onExtraSubtitlesTrackSelected(extraSubtitlesTrack.id);
                defaultSubtitlesSelected.current = true;
            }
        }
    }, [video.state.subtitlesTracks, video.state.extraSubtitlesTracks]);

    React.useEffect(() => {
        if (!defaultAudioTrackSelected.current) {
            if (video.state.audioTracks.length === 0) return;
            const lastVideo = localStorage.getItem('lastVideo');
            const lastAudioTrackId = localStorage.getItem('audioTrackId');
            const foundAudioTrack = video.state.audioTracks.find((track) => track.id === lastAudioTrackId);
            if (lastVideo === urlParams.id && lastAudioTrackId && foundAudioTrack) {
                onAudioTrackSelected(lastAudioTrackId);
                defaultAudioTrackSelected.current = true;
                return;
            }
            const findTrackByLang = (tracks, lang) => tracks.find((track) => track.lang === lang || langs.where('1', track.lang)?.[2] === lang);
            const audioTrack = findTrackByLang(video.state.audioTracks, settings.audioLanguage);

            if (audioTrack && audioTrack.id) {
                onAudioTrackSelected(audioTrack.id);
                defaultAudioTrackSelected.current = true;
            }
        }
    }, [video.state.audioTracks]);

    React.useEffect(() => {
        defaultSubtitlesSelected.current = false;
        defaultAudioTrackSelected.current = false;
        nextVideoPopupDismissed.current = false;
    }, [video.state.stream]);

    React.useEffect(() => {
        if ((!Array.isArray(video.state.subtitlesTracks) || video.state.subtitlesTracks.length === 0) &&
            (!Array.isArray(video.state.extraSubtitlesTracks) || video.state.extraSubtitlesTracks.length === 0)) {
            closeSubtitlesMenu();
        }
    }, [video.state.subtitlesTracks, video.state.extraSubtitlesTracks]);

    React.useEffect(() => {
        if (!Array.isArray(video.state.audioTracks) || video.state.audioTracks.length === 0) {
            closeAudioMenu();
        }
    }, [video.state.audioTracks]);

    React.useEffect(() => {
        if (video.state.playbackSpeed === null) {
            closeSpeedMenu();
        }
    }, [video.state.playbackSpeed]);

    React.useEffect(() => {
        const toastFilter = (item) => item?.dataset?.type === 'CoreEvent';
        toast.addFilter(toastFilter);
        const onCastStateChange = () => {
            setCasting(chromecast.active && chromecast.transport.getCastState() === cast.framework.CastState.CONNECTED);
        };
        const onChromecastServiceStateChange = () => {
            onCastStateChange();
            if (chromecast.active) {
                chromecast.transport.on(
                    cast.framework.CastContextEventType.CAST_STATE_CHANGED,
                    onCastStateChange
                );
            }
        };
        const onCoreEvent = ({ event }) => {
            if (event === 'PlayingOnDevice') {
                onPauseRequested();
            }
        };
        chromecast.on('stateChanged', onChromecastServiceStateChange);
        core.transport.on('CoreEvent', onCoreEvent);
        onChromecastServiceStateChange();
        return () => {
            toast.removeFilter(toastFilter);
            chromecast.off('stateChanged', onChromecastServiceStateChange);
            core.transport.off('CoreEvent', onCoreEvent);
            if (chromecast.active) {
                chromecast.transport.off(
                    cast.framework.CastContextEventType.CAST_STATE_CHANGED,
                    onCastStateChange
                );
            }
        };
    }, []);

    React.useLayoutEffect(() => {
        const onKeyDown = (event) => {
            switch (event.code) {
                case 'MediaPlayPause':
                case 'Space': {
                    if (!menusOpen && !nextVideoPopupOpen && video.state.paused !== null) {
                        if (video.state.paused) {
                            onPlayRequested();
                            setSeeking(false);
                        } else {
                            onPauseRequested();
                        }
                    }

                    break;
                }
                case 'Numpad6':
                case 'MediaTrackNext':
                case 'ArrowRight': {
                    if (!menusOpen && !nextVideoPopupOpen && video.state.time !== null) {
                        const seekDuration = event.shiftKey ? settings.seekShortTimeDuration : settings.seekTimeDuration;
                        setSeeking(true);
                        onSeekRequested(video.state.time + seekDuration);
                    }

                    break;
                }
                case 'Numpad4':
                case 'MediaTrackPrevious':
                case 'ArrowLeft': {
                    if (!menusOpen && !nextVideoPopupOpen && video.state.time !== null) {
                        const seekDuration = event.shiftKey ? settings.seekShortTimeDuration : settings.seekTimeDuration;
                        setSeeking(true);
                        onSeekRequested(video.state.time - seekDuration);
                    }

                    break;
                }
                case 'Numpad8':
                case 'ArrowUp': {
                    if (!menusOpen && !nextVideoPopupOpen && video.state.volume !== null) {
                        onVolumeChangeRequested(video.state.volume + 5);
                    }

                    break;
                }
                case 'Numpad2':
                case 'ArrowDown': {
                    if (!menusOpen && !nextVideoPopupOpen && video.state.volume !== null) {
                        onVolumeChangeRequested(video.state.volume - 5);
                    }

                    break;
                }
                case 'KeyS': {
                    closeMenus();
                    if ((Array.isArray(video.state.subtitlesTracks) && video.state.subtitlesTracks.length > 0) ||
                        (Array.isArray(video.state.extraSubtitlesTracks) && video.state.extraSubtitlesTracks.length > 0)) {
                        toggleSubtitlesMenu();
                    }

                    break;
                }
                case 'KeyA': {
                    closeMenus();
                    if (Array.isArray(video.state.audioTracks) && video.state.audioTracks.length > 0) {
                        toggleAudioMenu();
                    }

                    break;
                }
                case 'KeyI': {
                    closeMenus();
                    if (player.metaItem !== null && player.metaItem.type === 'Ready') {
                        toggleSideDrawer();
                    }

                    break;
                }
                case 'KeyR': {
                    closeMenus();
                    if (video.state.playbackSpeed !== null) {
                        toggleSpeedMenu();
                    }

                    break;
                }
                case 'KeyD': {
                    closeMenus();
                    if (streamingServer.statistics !== null && streamingServer.statistics.type !== 'Err' && player.selected && typeof player.selected.stream.infoHash === 'string' && typeof player.selected.stream.fileIdx === 'number') {
                        toggleStatisticsMenu();
                    }

                    break;
                }
                case 'Escape': {
                    closeMenus();
                    break;
                }
                default: {
                    /*
                      * Mpv input.conf wants literal keys, we do the following to convert:
                      * 1) Map special event.code values to mpv-friendly names (e.g., ArrowLeft → LEFT).
                      * 2) Convert modifiers (Shift, Ctrl, Alt, Meta) into mpv’s SHIFT+, CTRL+, ALT+, META+ prefixes.
                      * 3) For plain letters or digits, remove "Key", "Digit", "Numpad", etc. from event.code.
                      * 4) Ensure correct casing.
                      *
                      * Note that mpv accepts either symbolic names (e.g., LEFT, SHIFT+LEFT) or literal characters
                      * (e.g. "a", or "!" if Shift+1). According to mpv docs, either approach works
                      * We'll generally use modifiers (e.g., SHIFT+1) for shifted digits or punctuation, plus
                      * symbolic names for non-character keys.
                    */
                    const specialMap = {
                        'ArrowLeft': 'LEFT',
                        'ArrowRight': 'RIGHT',
                        'ArrowUp': 'UP',
                        'ArrowDown': 'DOWN',
                        'Space': 'SPACE',
                        'Enter': 'ENTER',
                        'Escape': 'ESC',
                        'Backspace': 'BS',
                        'Tab': 'TAB',
                        'PrintScreen': 'PRINT_SCREEN',
                        'ScrollLock': 'SCROLL_LOCK',
                        'Pause': 'PAUSE',
                        'Insert': 'INSERT',
                        'Home': 'HOME',
                        'PageUp': 'PAGE_UP',
                        'Delete': 'DELETE',
                        'End': 'END',
                        'PageDown': 'PAGE_DOWN',
                        'NumpadAdd': 'KP_PLUS',
                        'NumpadSubtract': 'KP_MINUS',
                        'NumpadMultiply': 'KP_MULTIPLY',
                        'NumpadDivide': 'KP_DIVIDE',
                        'NumpadEnter': 'KP_ENTER',
                        'NumpadDecimal': 'KP_PERIOD',
                        'Numpad0': 'KP0',
                        'Numpad1': 'KP1',
                        'Numpad2': 'KP2',
                        'Numpad3': 'KP3',
                        'Numpad4': 'KP4',
                        'Numpad5': 'KP5',
                        'Numpad6': 'KP6',
                        'Numpad7': 'KP7',
                        'Numpad8': 'KP8',
                        'Numpad9': 'KP9',
                        'Comma': ',',
                        'Period': '.',
                        'Slash': '/',
                        'Semicolon': ';',
                        'Quote': "'",
                        'BracketLeft': '[',
                        'BracketRight': ']',
                        'Backslash': '\\',
                        'Minus': '-',
                        'Equal': '=',
                        'Backquote': '`',
                        'CapsLock': ''
                    };

                    if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) {
                        break;
                    }
                    let baseKey = specialMap[event.code];
                    if (!baseKey) {
                        baseKey = event.code
                            .replace(/^Key/, '')
                            .replace(/^Digit/, '')
                            .replace(/^Numpad/, '');
                    }

                    const modifiers = [];
                    if (event.shiftKey && event.code !== 'Shift') modifiers.push('SHIFT');
                    if (event.ctrlKey && event.code !== 'Control') modifiers.push('CTRL');
                    if (event.altKey && event.code !== 'Alt') modifiers.push('ALT');
                    if (event.metaKey && event.code !== 'Meta') modifiers.push('META');

                    let finalKey;
                    if (modifiers.length > 0) {
                        finalKey = modifiers.join('+') + '+' + baseKey;
                    } else {
                        finalKey = /^[A-Z0-9]$/i.test(baseKey) ? baseKey.toLowerCase() : baseKey;
                    }

                    if (finalKey) {
                        shell.transport.send('mpv-command', ['keypress', finalKey]);
                    }
                    break;
                }
            }
        };
        const onKeyUp = (event) => {
            if (event.code === 'ArrowRight' || event.code === 'ArrowLeft' || event.code === 'Numpad6' || event.code === 'Numpad4') {
                setSeeking(false);
            }
        };
        const onWheel = ({ deltaY }) => {
            if (deltaY > 0) {
                if (!menusOpen && video.state.volume !== null) {
                    onVolumeChangeRequested(video.state.volume - 5);
                }
            } else {
                if (!menusOpen && video.state.volume !== null) {
                    onVolumeChangeRequested(video.state.volume + 5);
                }
            }
        };
        if (routeFocused) {
            window.addEventListener('keydown', onKeyDown);
            window.addEventListener('keyup', onKeyUp);
            window.addEventListener('wheel', onWheel);
        }
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('wheel', onWheel);
        };
    }, [player.metaItem, player.selected, streamingServer.statistics, settings.seekTimeDuration, settings.seekShortTimeDuration, routeFocused, menusOpen, nextVideoPopupOpen, video.state.paused, video.state.time, video.state.volume, video.state.audioTracks, video.state.subtitlesTracks, video.state.extraSubtitlesTracks, video.state.playbackSpeed, toggleSubtitlesMenu, toggleStatisticsMenu, toggleSideDrawer]);

    React.useEffect(() => {
        video.events.on('error', onError);
        video.events.on('ended', onEnded);
        video.events.on('subtitlesTrackLoaded', onSubtitlesTrackLoaded);
        video.events.on('extraSubtitlesTrackLoaded', onExtraSubtitlesTrackLoaded);
        video.events.on('implementationChanged', onImplementationChanged);

        return () => {
            video.events.off('error', onError);
            video.events.off('ended', onEnded);
            video.events.off('subtitlesTrackLoaded', onSubtitlesTrackLoaded);
            video.events.off('extraSubtitlesTrackLoaded', onExtraSubtitlesTrackLoaded);
            video.events.off('implementationChanged', onImplementationChanged);

            localStorage.setItem('lastVideo', urlParams.id);
        };
    }, []);

    React.useLayoutEffect(() => {
        return () => {
            setImmersedDebounced.cancel();
            onPlayRequestedDebounced.cancel();
            onPauseRequestedDebounced.cancel();
        };
    }, []);

    return (
        <div className={classnames(styles['player-container'], { [styles['overlayHidden']]: overlayHidden })}
            onMouseDown={onContainerMouseDown}
            onMouseMove={onContainerMouseMove}
            onMouseOver={onContainerMouseMove}
            onMouseLeave={onContainerMouseLeave}>
            <Video
                ref={video.containerElement}
                className={styles['layer']}
                onClick={onVideoClick}
                onDoubleClick={onVideoDoubleClick}
            />
            {
                !video.state.loaded ?
                    <div className={classnames(styles['layer'], styles['background-layer'])}>
                        <img className={styles['image']} src={player?.metaItem?.content?.background} />
                    </div>
                    :
                    null
            }
            {
                (video.state.buffering || !video.state.loaded) && !error ?
                    <BufferingLoader className={classnames(styles['layer'], styles['buffering-layer'])} logo={player?.metaItem?.content?.logo} />
                    :
                    null
            }
            {
                error !== null ?
                    <Error
                        className={classnames(styles['layer'], styles['error-layer'])}
                        stream={video.state.stream}
                        {...error}
                    />
                    :
                    null
            }
            {
                menusOpen ?
                    <div className={styles['layer']} />
                    :
                    null
            }
            {
                video.state.volume !== null && overlayHidden ?
                    <VolumeChangeIndicator
                        muted={video.state.muted}
                        volume={video.state.volume}
                    />
                    :
                    null
            }
            <HorizontalNavBar
                className={classnames(styles['layer'], styles['nav-bar-layer'])}
                title={player.title !== null ? player.title : ''}
                backButton={true}
                fullscreenButton={true}
                onMouseMove={onBarMouseMove}
                onMouseOver={onBarMouseMove}
            />
            {
                player.metaItem?.type === 'Ready' ?
                    <SideDrawerButton
                        className={classnames(styles['layer'], styles['side-drawer-button-layer'])}
                        onClick={toggleSideDrawer}
                    />
                    :
                    null
            }
            <ControlBar
                className={classnames(styles['layer'], styles['control-bar-layer'])}
                paused={video.state.paused}
                time={video.state.time}
                duration={video.state.duration}
                buffered={video.state.buffered}
                volume={video.state.volume}
                muted={video.state.muted}
                playbackSpeed={video.state.playbackSpeed}
                subtitlesTracks={video.state.subtitlesTracks.concat(video.state.extraSubtitlesTracks)}
                audioTracks={video.state.audioTracks}
                metaItem={player.metaItem}
                nextVideo={player.nextVideo}
                stream={player.selected !== null ? player.selected.stream : null}
                statistics={statistics}
                onPlayRequested={onPlayRequested}
                onPauseRequested={onPauseRequested}
                onNextVideoRequested={onNextVideoRequested}
                onMuteRequested={onMuteRequested}
                onUnmuteRequested={onUnmuteRequested}
                onVolumeChangeRequested={onVolumeChangeRequested}
                onSeekRequested={onSeekRequested}
                onToggleOptionsMenu={toggleOptionsMenu}
                onToggleSubtitlesMenu={toggleSubtitlesMenu}
                onToggleAudioMenu={toggleAudioMenu}
                onToggleSpeedMenu={toggleSpeedMenu}
                onToggleStatisticsMenu={toggleStatisticsMenu}
                onToggleSideDrawer={toggleSideDrawer}
                onMouseMove={onBarMouseMove}
                onMouseOver={onBarMouseMove}
            />
            {
                nextVideoPopupOpen ?
                    <NextVideoPopup
                        className={classnames(styles['layer'], styles['menu-layer'])}
                        metaItem={player.metaItem !== null && player.metaItem.type === 'Ready' ? player.metaItem.content : null}
                        nextVideo={player.nextVideo}
                        onDismiss={onDismissNextVideoPopup}
                        onNextVideoRequested={onNextVideoRequested}
                    />
                    :
                    null
            }
            {
                statisticsMenuOpen ?
                    <StatisticsMenu
                        className={classnames(styles['layer'], styles['menu-layer'])}
                        {...statistics}
                    />
                    :
                    null
            }
            <Transition when={sideDrawerOpen} name={'slide-left'}>
                <SideDrawer
                    className={classnames(styles['layer'], styles['side-drawer-layer'])}
                    metaItem={player.metaItem?.content}
                    seriesInfo={player.seriesInfo}
                    closeSideDrawer={closeSideDrawer}
                />
            </Transition>
            {
                subtitlesMenuOpen ?
                    <SubtitlesMenu
                        className={classnames(styles['layer'], styles['menu-layer'])}
                        subtitlesTracks={video.state.subtitlesTracks}
                        selectedSubtitlesTrackId={video.state.selectedSubtitlesTrackId}
                        subtitlesOffset={video.state.subtitlesOffset}
                        subtitlesSize={video.state.subtitlesSize}
                        extraSubtitlesTracks={video.state.extraSubtitlesTracks}
                        selectedExtraSubtitlesTrackId={video.state.selectedExtraSubtitlesTrackId}
                        extraSubtitlesOffset={video.state.extraSubtitlesOffset}
                        extraSubtitlesDelay={video.state.extraSubtitlesDelay}
                        extraSubtitlesSize={video.state.extraSubtitlesSize}
                        onSubtitlesTrackSelected={onSubtitlesTrackSelected}
                        onExtraSubtitlesTrackSelected={onExtraSubtitlesTrackSelected}
                        onSubtitlesOffsetChanged={onSubtitlesOffsetChanged}
                        onSubtitlesSizeChanged={onSubtitlesSizeChanged}
                        onExtraSubtitlesOffsetChanged={onSubtitlesOffsetChanged}
                        onExtraSubtitlesDelayChanged={onExtraSubtitlesDelayChanged}
                        onExtraSubtitlesSizeChanged={onSubtitlesSizeChanged}
                    />
                    :
                    null
            }
            {
                audioMenuOpen ?
                    <AudioMenu
                        className={classnames(styles['layer'], styles['menu-layer'])}
                        audioTracks={video.state.audioTracks}
                        selectedAudioTrackId={video.state.selectedAudioTrackId}
                        onAudioTrackSelected={onAudioTrackSelected}
                    />
                    :
                    null
            }
            {
                speedMenuOpen ?
                    <SpeedMenu
                        className={classnames(styles['layer'], styles['menu-layer'])}
                        playbackSpeed={video.state.playbackSpeed}
                        onPlaybackSpeedChanged={onPlaybackSpeedChanged}
                    />
                    :
                    null
            }
            {
                optionsMenuOpen ?
                    <OptionsMenu
                        className={classnames(styles['layer'], styles['menu-layer'])}
                        stream={player.selected.stream}
                        playbackDevices={streamingServer.playbackDevices !== null && streamingServer.playbackDevices.type === 'Ready' ? streamingServer.playbackDevices.content : []}
                    />
                    :
                    null
            }
        </div>
    );
};

Player.propTypes = {
    urlParams: PropTypes.shape({
        stream: PropTypes.string,
        streamTransportUrl: PropTypes.string,
        metaTransportUrl: PropTypes.string,
        type: PropTypes.string,
        id: PropTypes.string,
        videoId: PropTypes.string
    }),
    queryParams: PropTypes.instanceOf(URLSearchParams)
};

const PlayerFallback = () => (
    <div className={classnames(styles['player-container'])} />
);

module.exports = withCoreSuspender(Player, PlayerFallback);
