/**
 * 数据定义:
 * 1.棋子: 黑、红、空
 * 2.棋子估值
 * 3.棋子走位表
 * 4.位置:棋盘坐标系、点、线、悔棋
 * 5.棋盘
 * 6.玩家(player)
 * 7.房间
 * 8.录像
 * 9.走棋规则
 * 10.ai
 * 11.开局库
 * 12.玩法类型定义(常规、揭棋、翻翻棋)
 * 13.游戏模式定义(金币、比赛、elo棋力评测、残局闯关、人机、好友房、排位赛、观战、教学、推演工具)
 * 
 * 
 * 术语定义:
 * 1.Piece 棋子，不要用chess！chess是国际象棋的意思
 * 
 * Desk --> Player --> Board --> Piece      Rule    AI
 * |        |           |          |        |       |
 * 维持     保存        保存        走棋      附加    计算
 * 游戏     玩家        棋子        基本      规则    下一步棋
 * 流程     信息        走棋信息     规则
 */

"use strict";

import { GameAudio } from "./audio.js";
import { Board } from "./board.js";
import { UIBoard } from "./ui.js"

const STARTUP_FEN = [
    "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w", // 不让子
    "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKAB1R w", // 让左马
    "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/R1BAKAB1R w", // 让双马
    "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/9/1C5C1/9/RN2K2NR w", // 让九子
];

export class Game {
    static getInstance() {
        if (!Game.instance) {
            Game.instance = new Game();
        }

        return Game.instance;
    }

    constructor() {
        this._imagePath = "../../images/";
        this._soundPath = "../../sounds/";
      
        this._audio = new GameAudio(this, this._soundPath);
        this._board = new Board(this);
        
        // 确保初始化 lastMotion
        this._board.lastMotion = 0;
      
        // 创建一个容器，用于初始化UIBoard
        let container = {
            style: {
                position: "relative",
                width: "521px",      // UI_BOARD_WIDTH
                height: "577px",     // UI_BOARD_HEIGHT
                background: `url(${this._imagePath}board.jpg)`
            },
            appendChild: function(child) {
                // 小程序中不需要操作DOM
            }
        };
          
        this._uiBoard = new UIBoard(this, container, this._imagePath);
        
        // 设置默认的游戏状态
        this.sound = true; // 声音开关
        this.animated = true; // 动画开关
    }
      
    onSelectSquare(sq) {
        console.log('游戏处理点击棋子', sq);
        // 如果游戏正忙或已结束，则返回
        if (this._board.busy || this._board.result) {
            console.log('游戏正忙或已结束，无法处理点击');
            return;
        }
        
        try {
            // 调用棋盘的选择方法
            this._board.selectedSquare(sq);
        } catch (error) {
            console.error('处理棋子选择时出错:', error);
        }
    }
    
    trySelectPiece(sq, pc) {
        const board = this._board;
        const pos = board.pos;
        
        // 检查点击的是否是自己方的棋子
        if (pc > 0 && (pc & 8) === (pos.sdPlayer === 0 ? 8 : 16)) {
            // 选中棋子，播放点击音效
            this._audio.playClickSound();
            board.sqSelected = sq;
            board.postSquareSelected();
            return true;
        }
        return false;
    }
    
    moveSelectedPiece(dstSq) {
        const board = this._board;
        if (board.sqSelected === dstSq) {
            // 点击的是已选中的棋子，取消选中
            board.sqSelected = 0;
            board.postSquareSelected();
            return true;
        }
        
        // 尝试移动到目标位置
        const srcSq = board.sqSelected;
        const mv = board.pos.makeMotionBySrcDst(srcSq, dstSq);
        if (mv === 0 || !board.pos.legalMove(mv)) {
            // 移动不合法
            this.onIllegalMove();
            return false;
        }
        
        // 取消选中状态
        board.sqSelected = 0;
        board.postSquareSelected();
        
        // 执行移动
        board.addMotion(mv);
        return true;
    }

    setMaxThinkTimeMs(millis) {
        this._board.millis = millis;
    }

    restartGame(strFen) {
        this._board.restart(strFen)
    }

    getBoard() {
        return this._board;
    }

    onIllegalMove() {
        this._audio.playIllegalSound();
    }

    /**
     * @method 输了
     * @param {number} reason 输的原因，0-正常打输了, 1-我方长将/长捉
     */
    onLose(reason) {
        this._audio.playLoseSound();
        let rea = reason || 0; // 默认为正常输
        if (1 == rea) {
            this._uiBoard.alertDelay("长打作负，请不要气馁！");
        }
    }

    /**
     * @method 赢了
     * @param {number} reason 0-正常打赢, 1-对方长捉/长将
     */
    onWin(reason) {
        this._audio.playWinSound();
        let rea = reason || 0;
        if (1 == rea) {
            this._uiBoard.alertDelay("长打作负，祝贺你取得胜利！");
        }
    }

    /**
     * @method 平局
     * @param {number} reason,0-不变着法, 1-双方没有进攻棋子了
     */
    onDraw(reason) {
        this._audio.playDrawSound();
        if (0 == reason) {
            this._uiBoard.alertDelay("双方不变作和，辛苦了！");
        } else if (1 == reason) {
            this._uiBoard.alertDelay("双方都没有进攻棋子了，辛苦了！");
        } else if (2 == reason) {
            this._uiBoard.alertDelay("超过自然限着作和，辛苦了！");
        }
    }

    onOver(isWin){
        this._uiBoard.alertDelay(isWin ? "请再接再厉！" : "祝贺你取得胜利！");
    }

    onClickChess() {
        this._audio.playClickSound();
    }

    onCheck() {
        this._audio.playCheckSound();
    }

    onAICheck() {
        this._audio.playAICheckSound();
    }

    onCapture() {
        this._audio.playCaptureSound();
    }

    onAICapture() {
        this._audio.playAIMoveSound();
    }

    onMove() {
        this._audio.playMoveSound();
    }

    onAIMove() {
        this._audio.playAIMoveSound();
    }

    onNewGame() {
        this._audio.playNewGameSound();
    }

    getSound() {
        return this.sound;
    }

    setSound(value) {
        this.sound = !!value;
    }

    setAnimated(value) {
        this.animated = !!value;
    }

    getAnimated() {
        return this.animated;
    }

    beginThinking() {
        this._uiBoard.showThinkBox();
    }

    endThinking() {
        this._uiBoard.hideThinkBox();
    }

    /**
     * @method 点击重新开始
     */
    onClickRestart() {
        selMoveList.options.length = 1;
        selMoveList.selectedIndex = 0;
        this._board.computer = 1 - selMoveMode.selectedIndex;
        this.restartGame(STARTUP_FEN[selHandicap.selectedIndex]);
    }

    /**
     * @method 点击悔棋
     */
    onClickRetract() {
        for (let i = this._board.pos.motionList.length; i < selMoveList.options.length; i++) {
            this._board.pos.makeMove(parseInt(selMoveList.options[i].value));
        }
        this._board.retract();
        selMoveList.options.length = this._board.pos.motionList.length;
        selMoveList.selectedIndex = selMoveList.options.length - 1;
    }

    /**
     * @method 设置AI等级
     */
    onClickLevelChange() {
        let thinkTimeMs = Math.pow(10, selLevel.selectedIndex + 1);
        this.setMaxThinkTimeMs(thinkTimeMs);
    }

    /**
     * @method 走棋记录有变更
     */
    onRecordListChange() {
        const board = this.getBoard();
        if (board.isInit()) {
            selMoveList.selectedIndex = selMoveList.options.length - 1;
            return;
        }

        let from = board.pos.motionList.length;
        let to = selMoveList.selectedIndex;
        if (from == to + 1) {
            return;
        }

        if (from > to + 1) {
            for (let i = to + 1; i < from; i++) {
                board.pos.undoMakeMove();
            }
        } else {
            for (let i = from; i <= to; i++) {
                board.pos.makeMove(parseInt(selMoveList.options[i].value));
            }
        }
        board.flushBoard();
    }

    /**
     * 刷新棋盘UI
     */
    onFlushBoard() {
        this._uiBoard.flushBoard();
    }

    /**
     * @method 绘制棋子
     * @param {number} sq 棋子坐标 
     * @param {boolean} selected 是否选中状态 0-未选中, 1-选中
     */
    onDrawSquare(sq, selected, piece){
        this._uiBoard.drawSquare(sq, selected, piece)
    }

    async onAddMove(text, value,){
        await this._uiBoard.addMove(text, value,)
    }

    async onMovePiece(posSrc, posDst){
        await this._uiBoard.fakeAnimation(posSrc, posDst);
    }

    async onMate(sqMate,sdPlayer){
        await this._uiBoard.onMate(sqMate,sdPlayer);
    }
}


