/**
 * Author: DrowsyFlesh
 * Create: 2019/11/13
 * Description:
 */
import {Icon, Image} from 'Components';
import React, {useState, useCallback, useEffect, useRef} from 'react';
import styled, {keyframes} from 'styled-components';
import {SongList} from './SongList';
import {throttle, debounce} from 'lodash';

const EMPTY_IMAGE_SRC = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const fadeIn = keyframes`
  0% {
    opacity: 0;
    transform: translate(0, 10px);
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translate(0, 0px);
    opacity: 1;
  }
`;

const Wrapper = styled.div.attrs({'id': 'player'})`
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 42px;
  z-index: 10;
  animation-name: ${fadeIn};
  animation-duration: 200ms;
  animation-fill-mode: backwards;
  animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
`;

const PlayerWrapper = styled.div.attrs({
    className: 'player-controller',
})`
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 42px;
  box-sizing: border-box;
  box-shadow: rgba(17, 17, 17, 0.7) 0px 10px 30px;
  background-color: #333;
  background-image: linear-gradient(45deg, #333, #111);
  z-index: 1;
`;

const Cover = styled(Image)`
  position: absolute;
  width: 64px;
  height: 64px;
  bottom: 6px;
  left: 6px;
  //margin: 0px auto -80px 6px;
  margin-bottom: -70px;
  border-radius: 4px;
  background-color: #ddd;
  box-shadow: rgba(0, 0, 0, 0.5) 0px 2px 6px -2px;
  opacity: 0;
  cursor: pointer;
  -webkit-user-drag: none;
  transition: opacity 300ms, margin 300ms;
  
  &.show {
    opacity: 1;
    margin-bottom: 0px;
  }
  
  &.expand {
    opacity: 0;
    margin-top: 6px;
    margin-bottom: -70px;
  }
`;

const PlayerBtn = styled(Icon)`
  position: relative;
  margin: 3px;
  border-radius: 50%;
  color: #999;
  cursor: pointer;
  transition: color 300ms;
  text-shadow: rgba(0, 0, 0, 0.5) 0px 2px 2px;
  
  &:hover {
    color: #666;
  }
  
  &:active {
    color: #555;
  }
  
  &[disabled] {
    color: #444;
    cursor: not-allowed;
  }
`;

const StarBox = styled.div`
  margin-left: auto;
  position: relative;
`;

const StarList = styled.div`

`;

const StarBtn = styled(PlayerBtn).attrs({
    className: 'star-btn',
})`
  padding: 4px;
`;

const PlayBtn = styled(PlayerBtn).attrs({
    className: 'play-btn',
})`
  margin: 0;
  padding: 10px 8px 10px 10px;
`;

const PrevBtn = styled(PlayerBtn).attrs({
    className: 'prev-btn',
})`
  margin-right: 0;
  //margin-left: auto;
  padding: 8px;
`;

const NextBtn = styled(PlayerBtn).attrs({
    className: 'next-btn',
})`
  margin-left: 0;
  //margin-right: auto;
  padding: 8px;
`;

const VolumeBox = styled.div`
  position: relative;
`;

const VolumeBar = styled.input.attrs({
    className: 'volume-bar',
})`
  position: absolute;
  bottom: 25px;
  left: calc(-50% + 18px);
  width: 20px;
  height: 100px;
  //transform: translate(0px, 140px);
  -webkit-appearance: slider-vertical;
  //opacity: 0;
  user-select: none;
  transition: opacity 200ms, transform 200ms;
  display: none;
  
  &.show {
    display: block;
    //opacity: 1;
    //transform: translate(0px, 0px);
  }
  
  &::-webkit-slider-thumb {
    background-color: #222;
    border: none;
    cursor: pointer;
  }
  
  &::-webkit-slider-container {
    background-color: transparent;
  }
  
  &::-webkit-slider-runnable-track {
    padding: 2px;
    border-radius: 30px; 
    background: #222;
    box-shadow: rgba(0, 0, 0, 0.5) 0px 2px 2px;;
  }
`;

const VolumeBtn = styled(PlayerBtn).attrs({
    className: 'volume-btn',
})`
  padding: 4px;
`;

const PlayModeBtn = styled(PlayerBtn).attrs({
    className: 'play-mode-btn',
})`
  padding: 4px;
`;

const ListBtn = styled(PlayerBtn).attrs({
    className: 'list-btn',
})`
  margin-right: 8px;
  padding: 4px;
`;

const DurationBar = styled.div`

`;

const getPlayModeStr = (mode) => {
    switch (mode) {
        case 0:
            return 'orderList';
        case 1:
            return 'loopList';
        case 2:
            return 'loopOne';
        case 3:
            return 'random';
    }
};

export const Player = function() {
    const volumeRef = useRef(null);
    const [song, setSong] = useState(null);
    const [songList, setSongList] = useState([]);
    const [showSongList, setShowSongList] = useState(false);
    const [muted, setMuted] = useState(false);

    const [showVolume, setShowVolume] = useState(false);
    const [volume, setVolume] = useState(1);
    const [playMode, setPlayMode] = useState(0);

    const handleOnClickCover = useCallback((song) => {
        chrome.runtime.sendMessage({
            command: 'setGAEvent',
            action: '点击-播放器',
            category: '封面',
            label: song.id,
        });
    }, []);

    // 播放/暂停按钮点击事件
    const handleOnClickPlayBtn = useCallback(() => {
        if (!song) return;
        chrome.runtime.sendMessage({command: !!song && song.playing ? 'pause' : 'play', from: 'player'});
    }, [song]);

    // 切到上一首歌
    const handleOnClickPrevBtn = useCallback(() => {
        chrome.runtime.sendMessage({command: 'setPrevSong', from: 'player'});
        chrome.runtime.sendMessage({
            command: 'setGAEvent',
            action: '点击-播放器',
            category: '上一首歌',
        });
    }, []);

    // 切到下一首歌
    const handleOnClickNextBtn = useCallback(() => {
        chrome.runtime.sendMessage({command: 'setNextSong', from: 'player'});
        chrome.runtime.sendMessage({
            command: 'setGAEvent',
            action: '点击-播放器',
            category: '下一首歌',
        });
    }, []);

    // 展开音量调节按钮
    const handleOnMouseEnterVolumeBox = useCallback(debounce(() => {
        setShowVolume(true);
    }), [songList, showVolume]);

    // 隐藏音量调节按钮
    const handleOnMouseLeaveVolumeBox = useCallback(debounce(() => {
        setShowVolume(false);
    }), [showVolume]);

    const handleOnClickVolumeBtn = useCallback(() => {
        setShowVolume(false);
        chrome.runtime.sendMessage({
            command: 'setMeted',
            from: 'player',
        }, setMuted);
    }, [showVolume]);

    // 音量调节
    const handleOnVolumeChange = useCallback(throttle(() => {
        chrome.runtime.sendMessage({
            command: 'setVolume',
            from: 'player',
            volume: volumeRef.current.value,
        });
    }, 100), [showVolume]);

    // 播放模式切换按钮
    const handleOnClickPlayModeBtn = useCallback(() => {
        chrome.runtime.sendMessage({
            command: 'setGAEvent',
            action: '点击-播放器',
            category: '切换播放模式',
        });
        chrome.runtime.sendMessage({command: 'switchPlayMode', from: 'player'}, (playMode) => {
            setPlayMode(playMode);
        });
    }, [playMode]);

    // 展开播放列表
    const handleOnClickSongListBtn = useCallback(() => {
        setShowSongList(!showSongList);
    }, [showSongList]);

    useEffect(() => {
        document.addEventListener('click', function(e) {
            const targetClassList = e.target.classList;
            if (!targetClassList.contains('volume-bar') && !targetClassList.contains('bilibili-music-icon-volume')) {
                setShowVolume(false);
            }
        });
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            const {command = '', from = ''} = message;
            if (from !== 'playerBackground') return true;
            //console.info(message);
            if (command === 'ended') {
                return true;
            } else if (command === 'pause') { // 暂停或播放结束
                setSong(message.song);
                setSongList(message.songList);
            } else if (command === 'play') {
                setSong(message.song);
                setSongList(message.songList);
            } else if (command === 'loadstart') {
                setSong(message.song);
            } else if ((command === 'addSongSuccessfully' || command === 'deleteSongSuccessfully' || command === 'modifySongListSuccessfully') && message.songList) {
                setSong(message.song);
                setSongList(message.songList);
            } else if (command === 'volumechange') {
                setVolume(message.volume);
            }
            sendResponse();
            return true;
        });
        chrome.runtime.sendMessage({command: 'getSongList', from: 'player'}, ({songList}) => {
            setSongList(songList);
        });
        // 初始化歌曲
        chrome.runtime.sendMessage({command: 'getCurrentSong', from: 'player'}, (song) => {
            setSong(song);
        });
        // 初始化音量
        chrome.runtime.sendMessage({command: 'getConfig', from: 'player'}, (config) => {
            volumeRef.current.value = config.volume;
            setPlayMode(config.playMode);
        });
    }, []);

    return (
        <Wrapper>
            <SongList show={showSongList} setShow={setShowSongList}/>
            <PlayerWrapper>
                <a
                    href={song ? `https://www.bilibili.com/audio/au${song.id}` : null}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <Cover
                        className={[
                            song && song.cover ? 'show' : null,
                        ]}
                        alt={song ? song.title : null}
                        src={song ? song.cover : EMPTY_IMAGE_SRC}
                        onClick={() => song ? handleOnClickCover(song) : null}
                    />
                </a>
                <StarBox>
                    <StarBtn disabled={songList.length === 0} icon="star" size={14}/>
                    <StarList>

                    </StarList>
                </StarBox>
                <PrevBtn disabled={songList.length <= 1} icon="prev" size={14} onClick={handleOnClickPrevBtn}/>
                <PlayBtn disabled={songList.length === 0} size={30} icon={song && song.playing ? 'pause' : 'play'} onClick={handleOnClickPlayBtn}/>
                <NextBtn disabled={songList.length <= 1} icon="next" size={14} onClick={handleOnClickNextBtn}/>
                <VolumeBox>
                    <VolumeBtn
                        icon={muted ? 'volume-muted' : 'volume'}
                        onMouseEnter={handleOnMouseEnterVolumeBox}
                        onMouseLeave={handleOnMouseLeaveVolumeBox}
                        onClick={handleOnClickVolumeBtn}
                    />
                    <VolumeBar
                        ref={volumeRef}
                        className={showVolume ? 'show' : ''}
                        type="range"
                        max={1}
                        min={0}
                        step={0.001}
                        defaultValue={volume}
                        onChange={handleOnVolumeChange}
                        onMouseEnter={handleOnMouseEnterVolumeBox}
                        onMouseLeave={handleOnMouseLeaveVolumeBox}
                    />
                </VolumeBox>
                <PlayModeBtn
                    icon={getPlayModeStr(playMode)}
                    onClick={handleOnClickPlayModeBtn}
                />
                <ListBtn icon="list1" size={16} onClick={handleOnClickSongListBtn}/>
            </PlayerWrapper>
        </Wrapper>
    );
};
