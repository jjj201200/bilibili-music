/* global process */
/**
 * Author: DrowsyFlesh
 * Create: 2018/12/9
 * Description:
 */
import {Feature} from 'Libs/feature';
import API from './apis';
import {fetchJSON} from 'Utils/https';

//import {__, createTab, hasNewVersion, version, getURL} from 'Utils';

export class DataManager extends Feature {
    constructor() {
        super({
            name: 'dataManager',
            kind: 'other',
            settings: {
                on: true,
                hide: true,
                toggle: false,
            },
        });
        this.store = this.store || {};
        this.tempData = {};
    }

    addListener = () => {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            const {command = ''} = message;
            if (command === 'getData') {
                sendResponse(this.tempData);
            } else if (command === 'getSongMenu' && message.sid) {
                this.getSongMenu(message.sid, message.pn, message.ps)
                    .then(res => {
                        sendResponse(res);
                    });
            } else if (command === 'starSongMenu' && message.songMenu) {
                this.starSongMenu(message.songMenu)
                    .then(() => {
                        chrome.runtime.sendMessage({
                            command: 'starSongMenuSuccessfully',
                            from: 'dataManager',
                            data: this.tempData,
                        });
                    });
            } else if (command === 'unStarSongMenu' && message.songMenu) {
                this.unStarSongMenu(message.songMenu)
                    .then(() => {
                        chrome.runtime.sendMessage({
                            command: 'unStarSongMenuSuccessfully',
                            from: 'dataManager',
                            data: this.tempData,
                        });
                    });
            }
            return true;
        });

    };

    launch = async () => {
        void this.initData();
    };

    initData = () => {
        return Promise.all([
            this.initAccount(),
            this.initBanner(),
            this.initHotRank(),
            this.initUserSongMenu(),
            this.initRecommendList(),
            this.initUserCollectedMenu(),
            this.initAllRank(),
        ]).then(([accountData, banner, hotRank, userMenu, recommendList, userCollectedMenu, allRank]) => {
            this.tempData = {
                account: accountData,
                banner,
                hotRank,
                userMenu,
                recommendList,
                userCollectedMenu,
                allRank,
            };
        });
    };

    /**
     * 用户数据
     * @returns {Promise<unknown>}
     */
    initAccount = () => fetchJSON(API.account);

    /**
     * banner
     * @returns {Promise<unknown>}
     */
    initBanner = () => fetchJSON(API.banner);

    /**
     * 热门榜单
     * @returns {Promise<unknown>}
     */
    initHotRank = () => fetchJSON(API.hotRank);

    /**
     * 全部榜单
     * @param pn
     * @param ps
     * @returns {Promise<unknown>}
     */
    initAllRank = (pn = 1, ps = 5) => {
        const resultDataList = [];
        const get = (pn, ps) => {
            return fetchJSON(`${API.allRank}?pn=${pn}&ps=${ps}`)
            .then(({curPage, pageCount, data}) => {
                resultDataList.push(...data);
                if (curPage < pageCount) {
                    return get(pn + 1, ps);
                } else {
                    return resultDataList;
                }
            });
        };
        return get(pn, ps);
    };

    /**
     * 用户歌单
     * @param pn
     * @param ps
     * @returns {Promise<unknown>}
     */
    initUserSongMenu = (pn = 1, ps = 5) => {
        const resultDataList = [];
        const get = (pn, ps) => {
            return fetchJSON(`${API.userSongMenu}?pn=${pn}&ps=${ps}`)
            .then(({curPage, pageCount, data}) => {
                resultDataList.push(...data);
                if (curPage < pageCount) {
                    return get(pn + 1, ps);
                } else {
                    return resultDataList;
                }
            });
        };
        return get(pn, ps);
    };

    /**
     * 用户收藏歌单
     * @param pn
     * @param ps
     * @returns {Promise<unknown>}
     */
    initUserCollectedMenu = (pn = 1, ps = 5) => {
        const resultDataList = [];
        const get = (pn, ps) => {
            return fetchJSON(`${API.userCollectedMenu}?pn=${pn}&ps=${ps}`)
            .then(({curPage, pageCount, data}) => {
                resultDataList.push(...data);
                if (curPage < pageCount) {
                    return get(pn + 1, ps);
                } else {
                    return resultDataList;
                }
            });
        };
        return get(pn, ps);
    };

    /**
     * 推荐歌单
     * @param pn
     * @param ps
     * @returns {Promise<unknown>}
     */
    initRecommendList = (pn = 1, ps = 10) => {
        const resultDataList = [];
        const get = (pn, ps) => {
            return fetchJSON(`${API.recommendList}?pn=${pn}&ps=${ps}`)
            .then(({curPage, pageCount, data}) => {
                resultDataList.push(...data);
                if (curPage < pageCount) {
                    return get(pn + 1, ps);
                } else {
                    return resultDataList;
                }
            });
        };
        return get(pn, ps);
    };

    /**
     * 推荐唱见
     * @param pn
     * @param ps
     * @returns {Promise<unknown>}
     */
    initRecommendUser = (pn = 1, ps = 3) => fetchJSON(`${API.recommendUser}?pn=${pn}&ps=${ps}`);

    /**
     * 获取歌单数据
     * @param sid
     * @param pn
     * @param ps
     */
    getSongMenu = (sid, pn = 1, ps = 100) => {
        const resultDataList = [];
        const get = (pn, ps) => {
            return fetchJSON(`${API.songMenu}?sid=${sid}&pn=${pn}&ps=${ps}`)
            .then(({curPage, pageCount, data}) => {
                resultDataList.push(...data);
                if (curPage < pageCount) {
                    return get(pn + 1, ps);
                } else {
                    return resultDataList;
                }
            });
        };
        return get(pn, ps);
    };

    getCSRF = () => {
        return new Promise((resolve, reject) => {
            chrome.cookies.get({
                url: 'http://interface.bilibili.com/',
                name: 'bili_jct',
            }, (cookie) => {
                const thisSecond = (new Date()).getTime() / 1000;
                // expirationDate 是秒数
                if (cookie && cookie.expirationDate > thisSecond) {
                    resolve(cookie.value);
                } else {
                    reject();
                }
            });
        });
    };

    /**
     * 收藏歌单
     * @param menuId
     */
    starSongMenu = ({menuId: sid}) => {
        return this.getCSRF().then((csrf) => {
            const formData = new FormData();
            formData.set('sid', sid);
            formData.set('csrf', csrf);
            return fetchJSON(API.starSongMenu, {method: 'POST', body: formData})
            .then(res => {
                if (res) {
                    return Promise.resolve();
                } else {
                    return Promise.reject();
                }
            })
            .then(this.initUserCollectedMenu)
            .then((userCollectedMenu) => {
                this.tempData.userCollectedMenu = userCollectedMenu;
            });
        });
    };

    /**
     * 取消收藏歌单
     * @param menuId
     */
    unStarSongMenu = ({menuId: sid}) => {
        return this.getCSRF().then((csrf) => {
            return fetchJSON(`${API.starSongMenu}?sid=${sid}`, {
                method: 'DELETE',
                body: `csrf=${csrf}`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            })
            .then(res => {
                if (res) {
                    return Promise.resolve();
                } else {
                    return Promise.reject();
                }
            })
            .then(this.initUserCollectedMenu)
            .then((userCollectedMenu) => {
                this.tempData.userCollectedMenu = userCollectedMenu;
            });
        });
    };
}
