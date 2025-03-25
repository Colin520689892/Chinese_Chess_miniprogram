"use strict";

import { getChessPosX, getChessPosY, isChessOnBoard } from "./position.js";

/**
 * UI中棋盘大小定义
 */
const UI_BOARD_WIDTH = 521; // 棋盘宽(px)
const UI_BOARD_HEIGHT = 577; // 棋盘高

/**
 * UI中棋子大小定义
 */
const UI_CCHESS_SIZE = 57; // 棋子大小

/**
 * 棋盘四周空余大小
 */
const UI_BOARD_LEFT_LINE_POS = (UI_BOARD_WIDTH - UI_CCHESS_SIZE * 9) >> 1;
const UI_BOARD_TOP_LINE_POS = (UI_BOARD_HEIGHT - UI_CCHESS_SIZE * 10) >> 1;

/**
 * Loading 图大小及位置
 */
const UI_THINKING_SIZE = 32; // 菊花图片的大小
const UI_THINKING_POS_LEFT = (UI_BOARD_WIDTH - UI_THINKING_SIZE) >> 1;
const UI_THINKING_POS_TOP = (UI_BOARD_HEIGHT - UI_THINKING_SIZE) >> 1;

// 动画最多拆分为8次移动
const MAX_STEP = 8;

/**
 * 图片资源名字: r-车、n-马、b-相、a-士、c-炮、p-卒
 */
const PIECE_NAME = [
    "oo", null, null, null, null, null, null, null, // [0, 7]
    "rk", "ra", "rb", "rn", "rr", "rc", "rp", null, // [8, 15] 红方
    "bk", "ba", "bb", "bn", "br", "bc", "bp", null, // [16, 24] 黑方
];

export class UIBoard {
    constructor(game, container, images) {
        this._game = game;
        this._images = images;

        // 在小程序中，这些视图元素会通过数据绑定显示
        this.thinking = { style: { visibility: "hidden" } };
        this.imgSquares = [];

        // 初始化棋子数组，但不再创建DOM元素
        for (let sq = 0; sq < 256; sq++) {
            if (!isChessOnBoard(sq)) {
                this.imgSquares.push(null);
                continue;
            }
            
            // 创建一个简单对象来表示棋子
            this.imgSquares.push({
                style: {
                    position: "absolute",
                    left: this.getUiXFromPos(sq) + "px",
                    top: this.getUiYFromPos(sq) + "px",
                    width: UI_CCHESS_SIZE + "px",
                    height: UI_CCHESS_SIZE + "px",
                    zIndex: 0,
                    backgroundImage: ""
                },
                src: "",
                sq: sq
            });
        }
    }

    // 这些方法将被页面JS中的方法重写
    showThinkBox() {
        this.thinking.style.visibility = "visible";
    }

    hideThinkBox() {
        this.thinking.style.visibility = "hidden";
    }

    flushBoard() {
        // 将在页面JS中被重写
    }

    drawSquare(sq, selected, piece) {
        // 将在页面JS中被重写
    }

    addMove(text, value) {
        // 将在页面JS中被重写
        return Promise.resolve();
    }

    fakeAnimation(posSrc, posDst) {
        // 动画将在页面JS中实现
        return Promise.resolve();
    }

    onMate(sqMate, sdPlayer) {
        // 将军特效将在页面JS中实现
        return Promise.resolve();
    }

    alertDelay(message, time) {
        // 在小程序中使用wx.showToast
        console.log(message);
        return Promise.resolve();
    }

    getUiXFromPos(pos) {
        return UI_BOARD_LEFT_LINE_POS + (getChessPosX(pos) - 3) * UI_CCHESS_SIZE;
    }

    getUiYFromPos(pos) {
        return UI_BOARD_TOP_LINE_POS + (getChessPosY(pos) - 3) * UI_CCHESS_SIZE;
    }

    async getMotionPixelByStep(src, dst, step) {
        return Math.floor((src * step + dst * (MAX_STEP - step)) / MAX_STEP + 0.5) + "px";
    }
}
