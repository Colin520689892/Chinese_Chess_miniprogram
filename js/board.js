"use strict";


import { Search, LIMIT_DEPTH } from "./search.js";
import {
    Position, isChessOnBoard, getSrcPosFromMotion,
    getDstPosFromMotion, WIN_VALUE
} from "./position.js";

// 开局
const normalFen = "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1"

// 对局结果
const Result = Object.freeze({
    INIT: 0,    // 初始值
    WIN: 1,     // 赢
    DRAW: 2,    // 平
    LOSS: 3,    // 输
})

/**
 * @class Board
 * @classdesc 棋盘
 */
export class Board {
    constructor(game) {
        this._game = game;

        this.pos = new Position();
        this.pos.fromFen(normalFen);

        this.search = null;
        this.sqSelected = 0; // 被选中的棋子
        this.millis = 0; // 思考的时间
        this.computer = -1; // 机器人开关, -1 - 不用机器, 0 - 机器人红方, 1 - 机器人黑方
        this.busy = false; // 是否思考中
        this.lastMotion = 0; // 最后一步棋
        this.result = Result.INIT; // 对局结果
    }

    initBoard(thinking = 10, computer = 1) {
        this.millis = thinking;
        this.computer = computer;
        this.lastMotion = 0; // 最后一步棋
        this.result = Result.INIT; // 对局结果
        this.flushBoard();
    }

    isInit() {
        return this.result === Result.INIT
    }

    setSearch(hashLevel) {
        this.search = hashLevel == 0 ? null : new Search(this.pos, hashLevel);
    }

    // 翻转棋子位置
    flipped(sq) {
        return this.computer == 0 ? this.pos.flipPos(sq) : sq;
    }

    /**
     * 是否该机器人走棋了
     * @returns {bool} true - 是
     */
    computerMove() {
        return this.pos.sdPlayer == this.computer;
    }

    computerLastMove() {
        return 1 - this.pos.sdPlayer == this.computer;
    }

    /**
     * 走棋
     * @param {number} mv 着法
     * @param {bool} computerMove 当前是否机器人走棋
     */
    async addMove(mv, computerMove) {
        if (!this.pos.legalMove(mv)) {
            return;
        }

        // 判定是否长将/长捉
        if (!this.pos.makeMove(mv)) {
            this._game.onIllegalMove();
            return;
        }

        this.busy = true;
        if (!this._game.getAnimated()) {
            await this.postAddMove(mv, computerMove);
            return;
        }

        let posSrc = this.flipped(getSrcPosFromMotion(mv));
        let posDst = this.flipped(getDstPosFromMotion(mv));
        await this._game.onMovePiece(posSrc, posDst)

        await this.postAddMove(mv, computerMove);
    }

    async postAddMove(mv, computerMove) {
        if (this.lastMotion > 0) {
            this.drawSquare(getSrcPosFromMotion(this.lastMotion), false);
            this.drawSquare(getDstPosFromMotion(this.lastMotion), false);
        }
        this.drawSquare(getSrcPosFromMotion(mv), true);
        this.drawSquare(getDstPosFromMotion(mv), true);
        this.sqSelected = 0;
        this.lastMotion = mv;

        if (this.pos.isMate()) {
            if (computerMove) {
                this.result = Result.LOSS;
                this._game.onLose();
            } else {
                this.result = Result.WIN;
                this._game.onWin();
            }

            let pc = this.pos.getSelfSideTag(this.pos.sdPlayer);
            let sqMate = 0;
            for (let sq = 0; sq < 256; sq++) {
                if (this.pos.squares[sq] == pc) {
                    sqMate = sq;
                    break;
                }
            }

            if (!this._game.getAnimated() || sqMate == 0) {
                this.postMate(computerMove);
                return;
            }

            let sdPlayer = this.pos.sdPlayer == 0 ? "r" : "b"
            await this._game.onMate(this.flipped(sqMate), sdPlayer);

            this.postMate(computerMove);
            return;
        }

        let vlRep = this.pos.repStatus(3);
        if (vlRep > 0) {
            vlRep = this.pos.repValue(vlRep);
            if (vlRep > -WIN_VALUE && vlRep < WIN_VALUE) {
                this._game.onDraw(0);
                this.result = Result.DRAW;
            } else if (computerMove == (vlRep < 0)) {
                this._game.onLose(1);
                this.result = Result.LOSS;
            } else {
                this._game.onWin(1);
                this.result = Result.WIN;
            }
            await this.onAddMove();
            this.busy = false;
            return;
        }

        if (this.pos.captured()) {
            let hasMaterial = false;
            for (let sq = 0; sq < 256; sq++) {
                if (isChessOnBoard(sq) && (this.pos.squares[sq] & 7) > 2) {
                    hasMaterial = true;
                    break;
                }
            }
            if (!hasMaterial) {
                this._game.onDraw(1);
                this.result = Result.DRAW;
                await this.onAddMove();
                this.busy = false;
                return;
            }
        } else if (this.pos.pcList.length > 100) {
            let captured = false;
            for (let i = 2; i <= 100; i++) {
                if (this.pos.pcList[this.pos.pcList.length - i] > 0) {
                    captured = true;
                    break;
                }
            }
            if (!captured) {
                this._game.onDraw(2);
                this.result = Result.DRAW;
                await this.onAddMove();
                this.busy = false;
                return;
            }
        }

        if (this.pos.inCheck()) {
            if (computerMove) {
                this._game.onAICheck();
            } else {
                this._game.onCheck();
            }
        } else if (this.pos.captured()) {
            if (computerMove) {
                this._game.onAICapture();
            } else {
                this._game.onCapture();
            }
        } else {
            if (computerMove) {
                this._game.onAIMove();
            } else {
                this._game.onMove();
            }
        }

        await this.onAddMove();
        this.response();
    }

    async postMate(computerMove) {
        this._game.onOver(computerMove)
        await this.onAddMove();
        this.busy = false;
    }

    /**
     * @method AI 计算做出响应
     */
    response() {
        console.log('Board.response 被调用');
        console.log('当前状态:', {
            sdPlayer: this.pos.sdPlayer,
            computer: this.computer,
            computerMove: this.computerMove(),
            search: this.search !== null,
            busy: this.busy
        });
        
        if (!this.computerMove() || this.search === null) {
            console.log('不需要AI响应，返回');
            this.busy = false;
            return;
        }
        
        try {
            // 设置状态为忙碌，并显示思考框
            this.busy = true;
            this._game.beginThinking();
            
            // 使用setTimeout允许UI更新
            setTimeout(async () => {
                try {
                    console.log('AI开始计算最佳走法...');
                    
                    // 使用搜索引擎计算最佳走法
                    const bestMove = this.search.searchMain(LIMIT_DEPTH, this.millis);
                    console.log('AI计算出最佳走法:', bestMove);
                    
                    // 检查走法是否有效
                    if (bestMove === 0 || !this.pos.legalMove(bestMove)) {
                        console.error('AI计算出的走法无效');
                        this._game.endThinking();
                        this.busy = false;
                        return;
                    }
                    
                    // 执行AI的走法
                    await this.addMove(bestMove, true);
                    console.log('AI走棋完成');
                } catch (error) {
                    console.error('AI计算或走棋出错:', error);
                } finally {
                    this._game.endThinking();
                    this.busy = false;
                }
            }, 200); // 增加延迟，让UI有时间更新
        } catch (error) {
            console.error('AI响应准备时出错:', error);
            this._game.endThinking();
            this.busy = false;
        }
    }

    /**
     * @method 点击棋子
     * @param {number} pos 棋子坐标
     */
    async selectedSquare(pos) {
        console.log('Board.selectedSquare 被调用, 坐标:', pos);
        console.log('当前状态:', {
            busy: this.busy,
            result: this.result,
            sqSelected: this.sqSelected,
            lastMotion: this.lastMotion,
            playerSide: this.pos.sdPlayer,
            computer: this.computer
        });
        
        // 如果游戏正忙或已结束，则返回
        if (this.busy || this.result != Result.INIT) {
            console.log('游戏正忙或已结束，无法走棋');
            return;
        }

        try {
            // 这里的pos已经是经过转换的逻辑坐标了，不需要进一步处理
            let sq = pos;
            console.log('使用逻辑坐标:', sq, '十六进制:', sq.toString(16));
            
            // 检查坐标是否在有效范围内
            if (!isChessOnBoard(sq)) {
                console.error('坐标不在棋盘上:', sq);
                return;
            }
            
            // 获取此位置的棋子
            let pc = this.pos.squares[sq];
            console.log('位置上的棋子:', pc, '类型:', pc ? PIECE_NAME[pc] : '空位置');
            
            // 获取当前玩家的棋子标识
            let selfSideTag = this.pos.getSelfSideTag(this.pos.sdPlayer);
            console.log('当前玩家棋子标识:', selfSideTag, '当前玩家:', this.pos.sdPlayer);
            
            // 如果点击了自己的棋子
            if ((pc & selfSideTag) != 0) {
                console.log('选中自己的棋子');
                this._game.onClickChess();
                
                // 清除上一步走棋的高亮
                if (this.lastMotion != 0) {
                    this.drawSquare(getSrcPosFromMotion(this.lastMotion), false);
                    this.drawSquare(getDstPosFromMotion(this.lastMotion), false);
                }
                
                // 清除上一个选中棋子的高亮
                if (this.sqSelected) {
                    this.drawSquare(this.sqSelected, false);
                }
                
                // 高亮当前选中的棋子
                this.drawSquare(sq, true);
                this.sqSelected = sq;
                
                // 刷新棋盘以确保UI更新
                this.flushBoard();
            } 
            // 如果已经选中了一个棋子，并且点击了目标位置
            else if (this.sqSelected > 0) {
                console.log('执行移动，从', this.sqSelected, '到', sq);
                
                // 测试是否是空位置
                if (pc == 0) {
                    console.log('目标是空位置');
                }
                
                try {
                    // 生成走法并执行移动
                    const mv = this.pos.makeMotionBySrcDst(this.sqSelected, sq);
                    console.log('生成着法:', mv);
                    
                    // 检查走法是否合法
                    if (!this.pos.legalMove(mv)) {
                        console.log('走法不合法');
                        this._game.onIllegalMove();
                        return;
                    }
                    
                    await this.addMove(mv, false);
                    console.log('移动完成');
                } catch (error) {
                    console.error('执行移动时出错:', error);
                }
            } 
            // 既不是选中自己的棋子，也不是目标位置（点击了空位或对方棋子但未选中自己的棋子）
            else {
                console.log('无效点击，未选中己方棋子或点击无效位置');
                this._game.onIllegalMove();
            }
        } catch (error) {
        }
    }

    /**
     * @method 绘制棋子
     * @param {number} sq 棋子坐标
     * @param {boolean} selected 是否选中状态 0-未选中, 1-选中
     */
    drawSquare(sq, selected) {
        if (this._game._uiBoard) {
            this._game._uiBoard.drawSquare(this.flipped(sq), selected, this.pos.squares[sq]);
        }
    }

    /**
     * @method 刷新棋盘
     */
    flushBoard() {
        if (this._game._uiBoard) {
            this._game._uiBoard.flushBoard();
        }
    }

    /**
     * @method 重新开始
     * @param {string} fen 
     */
    restart(fen) {
        if (this.busy) return;

        this.initBoard();
        this.pos.fromFen(fen);
        this.flushBoard();
        this._game.onNewGame();
        this.response();
    }

    /**
     * @method 悔棋
     */
    retract() {
        if (this.busy || !this.isInit()) {
            return false;
        }
        
        this.result = Result.INIT;
        this.sqSelected = 0;
        
        if (this.pos.motionList.length <= 1) {
            return false;
        }
        
        if (this.computer < 0) {
            // 不用电脑
            this.pos.undoMakeMove();
        } else if (this.pos.sdPlayer === this.computer) {
            // 电脑走棋，需要悔两步
            this.pos.undoMakeMove();
            this.pos.undoMakeMove();
        } else {
            // 人走棋，需要悔一步
            this.pos.undoMakeMove();
        }
        
        if (this.pos.motionList.length > 0) {
            this.lastMotion = this.pos.motionList[this.pos.motionList.length - 1];
        } else {
            this.lastMotion = 0;
        }
        
        this.busy = false;
        this.flushBoard();
        return true;
    }

    /**
     * @method 显示着法
     */
    async onAddMove() {
        let counter = (this.pos.motionList.length >> 1);
        let space = (counter > 99 ? "    " : "   ");
        counter = (counter > 9 ? "" : " ") + counter + ".";
        let text = (this.pos.sdPlayer == 0 ? space : counter) +
            this.pos.move2Iccs(this.lastMotion);
        let value = "" + this.lastMotion;
        await this._game.onAddMove(text, value,)
    }

    // 添加着法
    async addMotion(mv) {
        this.addMove(mv, false);
    }
    
    // 处理棋子选中事件
    postSquareSelected() {
        if (this.sqSelected > 0) {
            this.drawSquare(this.sqSelected, true);
        } else if (this.lastMotion > 0) {
            this.drawSquare(getSrcPosFromMotion(this.lastMotion), true);
            this.drawSquare(getDstPosFromMotion(this.lastMotion), true);
        }
        this.flushBoard();
    }
}
