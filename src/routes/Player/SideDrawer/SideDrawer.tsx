// Copyright (C) 2017-2024 Smart code 203358507

import React, { useMemo, useCallback, useState, forwardRef, memo } from 'react';
import classNames from 'classnames';
import Icon from '@stremio/stremio-icons/react';
import { useServices } from 'stremio/services';
import { CONSTANTS } from 'stremio/common';
import MetaPreview from 'stremio/common/MetaPreview/MetaPreview';
import Video from 'stremio/common/Video/Video';
import SeasonsBar from 'stremio/routes/MetaDetails/VideosList/SeasonsBar';
import styles from './SideDrawer.less';

type Props = {
    className?: string;
    seriesInfo: SeriesInfo;
    metaItem: MetaItem;
    closeSideDrawer: () => void;
};

const SideDrawer = memo(forwardRef<HTMLDivElement, Props>(({ seriesInfo, className, closeSideDrawer, ...props }: Props, ref) => {
    const { core } = useServices();
    const [season, setSeason] = useState<number>(seriesInfo?.season);
    const metaItem = useMemo(() => {
        return seriesInfo ?
            {
                ...props.metaItem,
                links: props.metaItem.links.filter(({ category }) => category === CONSTANTS.SHARE_LINK_CATEGORY)
            }
            :
            props.metaItem;
    }, [props.metaItem]);
    const videos = useMemo(() => {
        return Array.isArray(metaItem.videos) ?
            metaItem.videos.filter((video) => video.season === season)
            :
            metaItem.videos;
    }, [metaItem, season]);
    const seasons = useMemo(() => {
        return props.metaItem.videos
            .map(({ season }) => season)
            .filter((season, index, seasons) => {
                return seasons.indexOf(season) === index;
            })
            .sort((a, b) => (a || Number.MAX_SAFE_INTEGER) - (b || Number.MAX_SAFE_INTEGER));
    }, [props.metaItem.videos]);

    const seasonOnSelect = useCallback((event: { value: string }) => {
        setSeason(parseInt(event.value));
    }, []);

    const onMarkVideoAsWatched = useCallback((video: Video, watched: boolean) => {
        core.transport.dispatch({
            action: 'Player',
            args: {
                action: 'MarkVideoAsWatched',
                args: [video, !watched]
            }
        });
    }, []);

    const onMouseDown = (event: React.MouseEvent) => {
        event.stopPropagation();
    };

    return (
        <div ref={ref} className={classNames(styles['side-drawer'], className)} onMouseDown={onMouseDown}>
            <div className={styles['close-button']} onClick={closeSideDrawer}>
                <Icon className={styles['icon']} name={'chevron-forward'} />
            </div>
            <div className={styles['info']}>
                <MetaPreview
                    className={styles['side-drawer-meta-preview']}
                    compact={true}
                    name={metaItem.name}
                    logo={metaItem.logo}
                    runtime={metaItem.runtime}
                    releaseInfo={metaItem.releaseInfo}
                    released={metaItem.released}
                    description={metaItem.description}
                    links={metaItem.links}
                />
            </div>
            {
                seriesInfo ?
                    <div className={styles['series-content']}>
                        <SeasonsBar
                            season={season}
                            seasons={seasons}
                            onSelect={seasonOnSelect}
                        />
                        <div className={styles['videos']}>
                            {videos.map((video, index) => (
                                <Video
                                    key={index}
                                    className={styles['video']}
                                    id={video.id}
                                    title={video.title}
                                    thumbnail={video.thumbnail}
                                    episode={video.episode}
                                    released={video.released}
                                    upcoming={video.upcoming}
                                    watched={video.watched}
                                    progress={video.progress}
                                    deepLinks={video.deepLinks}
                                    scheduled={video.scheduled}
                                    onMarkVideoAsWatched={onMarkVideoAsWatched}
                                />
                            ))}
                        </div>
                    </div>
                    : null
            }

        </div>
    );
}));

export default SideDrawer;
