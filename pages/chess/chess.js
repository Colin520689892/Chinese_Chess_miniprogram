// 使用 import 或 require 加载 game.js，路径根据你的目录结构来调整
import { Game } from '../../js/game.js';
import { getChessPosX, getChessPosY, isChessOnBoard, getSrcPosFromMotion, getDstPosFromMotion, Position } from '../../js/position.js';

// 搜索深度常量定义（原本应从search.js导入，但这里直接定义以避免问题）
const LIMIT_DEPTH = 64; // 最大搜索深度

// 原始棋盘大小
const ORIGINAL_UI_BOARD_WIDTH = 521;  // 原始棋盘宽度
const ORIGINAL_UI_BOARD_HEIGHT = 577; // 原始棋盘高度
const ORIGINAL_UI_CCHESS_SIZE = 57;   // 原始棋子大小

// 微信小程序屏幕适配 - 缩小比例
let SCALE_RATIO = 0.60; // 缩放比例

// 计算缩放后的尺寸
let UI_BOARD_WIDTH = Math.floor(ORIGINAL_UI_BOARD_WIDTH * SCALE_RATIO);
let UI_BOARD_HEIGHT = Math.floor(ORIGINAL_UI_BOARD_HEIGHT * SCALE_RATIO);
let UI_CCHESS_SIZE = Math.floor(ORIGINAL_UI_CCHESS_SIZE * SCALE_RATIO);

// 计算棋盘边距，与原始代码保持一致的计算方式
let UI_BOARD_LEFT = Math.floor((UI_BOARD_WIDTH - UI_CCHESS_SIZE * 9) / 2);
let UI_BOARD_TOP = Math.floor((UI_BOARD_HEIGHT - UI_CCHESS_SIZE * 10) / 2);

// 思考中图标大小
let UI_THINKING_SIZE = Math.floor(32 * SCALE_RATIO);
let UI_THINKING_POS_LEFT = Math.floor((UI_BOARD_WIDTH - UI_THINKING_SIZE) / 2);
let UI_THINKING_POS_TOP = Math.floor((UI_BOARD_HEIGHT - UI_THINKING_SIZE) / 2);

// 图片资源名字: r-车、n-马、b-相、a-士、c-炮、p-卒
const PIECE_NAME = [
    "oo", null, null, null, null, null, null, null, // [0, 7]
    "rk", "ra", "rb", "rn", "rr", "rc", "rp", null, // [8, 15] 红方
    "bk", "ba", "bb", "bn", "br", "bc", "bp", null, // [16, 24] 黑方
];

// 开局布局FEN
const STARTUP_FEN = [
    "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w", // 不让子
    "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKAB1R w", // 让左马
    "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/R1BAKAB1R w", // 让双马
    "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/9/1C5C1/9/RN2K2NR w", // 让九子
];

Page({
  data: {
    // 走棋列表初始数据
    moveList: ['=== 开始 ==='],
    selMoveIndex: 0,
    // "谁先走"选项
    moveModeOptions: ['我先走', '电脑先走', '不用电脑', 'AI对战AI'],
    moveModeIndex: 0,
    // "先走让子"选项
    handicapOptions: ['不让子', '让左马', '让双马', '让九子'],
    handicapIndex: 0,
    // "电脑水平"选项
    levelOptions: ['入门', '业余', '专业'],
    levelIndex: 0,
    // 动画和音效默认状态
    animated: true,
    sound: true,
    // 棋子数据
    chessPieces: [],
    // 思考中状态
    isThinking: false,
    // 棋盘和棋子尺寸
    boardWidth: UI_BOARD_WIDTH,
    boardHeight: UI_BOARD_HEIGHT,
    pieceSize: UI_CCHESS_SIZE,
    thinkingSize: UI_THINKING_SIZE,
    thinkingLeft: UI_THINKING_POS_LEFT,
    thinkingTop: UI_THINKING_POS_TOP,
    // AI对战AI
    aiVsAiMode: false,
    // 棋盘所有坐标点
    boardPoints: [],
    // 是否显示坐标点
    showBoardPoints: true,
    sidebarVisible: false,
    depthLevel: 10,
    timeLevel: 5,
    showCheckAlert: false
  },

  onLoad: function(options) {
    try {
      console.log("初始化游戏开始");
      
      // 初始化游戏实例
      this.game = new Game();
      // 重写游戏中的UI方法，使其适应小程序环境
      this.overrideGameMethods();
      
      // 重写音效方法
      this.overrideAudioMethods();
      
      // 计算棋盘上所有90个坐标点
      this.initBoardPoints();
      
      // 设置搜索引擎 (哈希表大小)
      this.game._board.setSearch(16);
      console.log("搜索引擎已初始化, 哈希表大小: 16");
      
      // 设置AI思考时间（毫秒）
      this.game.setMaxThinkTimeMs(1000);
      
      // 根据默认的设置初始化棋盘
      const moveMode = this.data.moveModeIndex;
      if (moveMode === 0) {
        this.game._board.computer = 1; // 电脑执黑
      } else if (moveMode === 1) {
        this.game._board.computer = 0; // 电脑执红
      } else {
        this.game._board.computer = -1; // 不用电脑
      }
      
      // 使用设置的让子模式初始化棋盘
      this.game.restartGame(STARTUP_FEN[this.data.handicapIndex]);
      
      // 重新渲染棋盘
      this.refreshChessPieces();
      
      // 如果是电脑先走，主动调用响应方法
      if (this.game._board.computerMove()) {
        console.log("电脑先走，调用response方法");
        setTimeout(() => {
          this.game._board.response();
        }, 500);
      }
      
      console.log("游戏初始化完成");
    } catch (error) {
      console.error("游戏初始化失败:", error);
      wx.showToast({
        title: '游戏加载失败: ' + error.message,
        icon: 'none',
        duration: 3000
      });
    }
  },
  onShareAppMessage: function () {
    return {
      title: '超强象棋ai小程序',
      path: '/pages/home/home'
    };
  },
  onShareTimeline() {
    return {
      title: '超强象棋ai小程序',
      path: '/pages/home/home'
    };
  },
  // 初始化棋盘90个坐标点
  initBoardPoints: function() {
    try {
      const boardPoints = [];
      
      // 遍历9x10的棋盘格子
      for (let y = 3; y <= 12; y++) {
        for (let x = 3; x <= 11; x++) {
          // 计算一维坐标
          const pos = x + (y << 4);
          
          // 计算UI坐标
          const uiX = this.getUiXFromPos(pos);
          const uiY = this.getUiYFromPos(pos);
          
          // 存储每个点的信息
          boardPoints.push({
            pos: pos,         // 一维坐标
            x: x,             // 棋盘x坐标
            y: y,             // 棋盘y坐标
            uiX: uiX,         // UI x坐标
            uiY: uiY,         // UI y坐标
            boardX: x - 3,    // 棋盘显示用x坐标(0-8)
            boardY: y - 3,    // 棋盘显示用y坐标(0-9)
            label: `(${x-3},${y-3})`, // 显示用标签
            hasPiece: false   // 是否有棋子
          });
        }
      }
      
      // 更新数据
      this.setData({ boardPoints: boardPoints });
      console.log(`已初始化${boardPoints.length}个棋盘坐标点`);
      
      // 输出前5个点的信息用于调试
      console.log("棋盘点示例:", boardPoints.slice(0, 5));
    } catch (error) {
      console.error("初始化棋盘坐标点出错:", error);
    }
  },
  
  // 切换显示棋盘点
  toggleBoardPoints: function(e) {
    // 从事件中获取选择状态
    const show = e.detail.value;
    this.setData({ showBoardPoints: show });
    
    console.log(`${show ? '显示' : '隐藏'}棋盘坐标点`);
    
    // 刷新棋盘
    this.refreshChessPieces();
  },
  
  // 点击棋盘上的点
  onBoardPointClick: function(e) {
    try {
      // 确保游戏已经初始化且不在思考中
      if (!this.game || this.game._board.busy) {
        return;
      }
      
      // 从事件中获取坐标点信息
      const pos = parseInt(e.currentTarget.dataset.pos);
      console.log('点击棋盘坐标点:', pos);
      
      // 找到该点的信息
      const point = this.data.boardPoints.find(p => p.pos === pos);
      if (!point) {
        console.error('找不到对应的坐标点信息');
        return;
      }
      
      // 获取该坐标上的棋子
      const piece = this.game._board.pos.squares[pos];
      const hasPiece = piece !== 0;
      
      // 显示点击信息
      console.log(`点击位置: (${point.x},${point.y}) -> 一维坐标: ${pos} -> ${hasPiece ? PIECE_NAME[piece] + '棋子' : '空位置'}`);
      
      // 显示选中效果
      if (this.data.showBoardPoints) {
        // 如果显示坐标点，显示一个临时的点击效果
        const updatedPoint = {...point, highlight: true};
        const boardPoints = [...this.data.boardPoints];
        const index = boardPoints.findIndex(p => p.pos === pos);
        boardPoints[index] = updatedPoint;
        
        // 短暂显示点击效果
        this.setData({ boardPoints });
        setTimeout(() => {
          boardPoints[index] = {...updatedPoint, highlight: false};
          this.setData({ boardPoints });
        }, 300);
      }
      
      // 直接调用Board的selectedSquare方法
      this.game._board.selectedSquare(pos);
      
      // 刷新UI以确保变化显示出来
      this.refreshChessPieces();
    } catch (error) {
      console.error('处理棋盘点击时出错:', error);
      wx.showToast({
        title: '处理棋盘点击出错: ' + error.message,
        icon: 'none',
        duration: 1500
      });
    }
  },

  // 重写游戏中的UI方法
  overrideGameMethods: function() {
    const self = this;
    
    // 重写显示思考框
    this.game._uiBoard.showThinkBox = function() {
      self.setData({ isThinking: true });
    };
    
    // 重写隐藏思考框
    this.game._uiBoard.hideThinkBox = function() {
      self.setData({ isThinking: false });
    };
    
    // 重写绘制棋子方法
    this.game._uiBoard.drawSquare = function(sq, selected, piece) {
      self.drawSquare(sq, selected, piece);
    };
    
    // 重写刷新棋盘方法
    this.game._uiBoard.flushBoard = function() {
      self.refreshChessPieces();
    };
    
    // 重写添加走棋着法
    this.game._uiBoard.addMove = function(text, value) {
      // 更新移动记录
      let moveList = self.data.moveList.slice();
      moveList.push(text);
      self.setData({
        moveList: moveList,
        selMoveIndex: moveList.length - 1
      });
      // 滚动到底部
      return Promise.resolve();
    };
    
    // 重写棋子动画
    this.game._uiBoard.fakeAnimation = function(posSrc, posDst) {
      // 记录源位置和目标位置
      console.log(`移动棋子: 从${posSrc}到${posDst}`);
      
      // 刷新棋盘状态
      self.refreshChessPieces();
      
      // 播放移动音效
      if (self.game.getSound()) {
        try {
          const audioContext = wx.createInnerAudioContext();
          audioContext.src = '../../sounds/move.wav';
          audioContext.play();
        } catch (error) {
          console.error('播放音效失败:', error);
        }
      }
      
      return Promise.resolve();
    };
    
    // 重写将军特效
    this.game._uiBoard.onMate = function(sqMate, sdPlayer) {
      // 简单实现，可以添加一些视觉效果
      return Promise.resolve();
    };
    
    // 提示框重写
    this.game._uiBoard.alertDelay = function(message, time) {
      wx.showToast({
        title: message,
        icon: 'none',
        duration: 2000
      });
      return Promise.resolve();
    };
    
    // 重写Board的response方法，修复AI走棋问题
    this.game._board.response = function() {
      console.log('Board.response 被调用');
      
      // 检查是否轮到电脑走棋
      if (!this.computerMove() || this.search === null) {
        console.log('不需要AI响应，返回');
        this.busy = false;
        return;
      }
      
      // 设置状态为忙碌，并显示思考框
      this.busy = true;
      self.game.beginThinking();
      
      // 使用setTimeout允许UI更新
      setTimeout(async () => {
        try {
          console.log('AI开始计算最佳走法...');
          
          // 使用搜索引擎计算最佳走法
          const bestMove = this.search.searchMain(LIMIT_DEPTH, this.millis);
          console.log('AI计算出最佳走法:', bestMove);
          
          // 检查走法是否有效
          if (bestMove === 0 || !this.pos.legalMove(bestMove)) {
            console.error('AI计算出的走法无效或当前无合法走法');
            self.game.endThinking();
            this.busy = false;
            return;
          }
          
          // 执行AI的走法
          await this.addMove(bestMove, true);
          console.log('AI走棋完成');
        } catch (error) {
          console.error('AI计算或走棋出错:', error);
          // 显示错误提示
          wx.showToast({
            title: 'AI走棋出错: ' + error.message,
            icon: 'none',
            duration: 3000
          });
        } finally {
          self.game.endThinking();
          this.busy = false;
        }
      }, 300); // 增加延迟，让UI有时间更新
    };
    
    // 添加辅助方法显示棋盘状态
    this.game._board.printBoardState = function() {
      console.log('===== 当前棋盘状态 =====');
      // 创建一个9x10的矩阵表示棋盘
      const boardMatrix = [];
      for (let y = 3; y <= 12; y++) {
        const row = [];
        for (let x = 3; x <= 11; x++) {
          const pos = x + (y << 4);
          const piece = this.pos.squares[pos];
          row.push(piece); // 0表示空位置
        }
        boardMatrix.push(row);
      }
      
      // 漂亮地打印棋盘矩阵
      console.log('棋盘矩阵 (0=空位置):');
      boardMatrix.forEach((row, index) => {
        console.log(`行${index+3}: [${row.join(', ')}]`);
      });
      
      // 显示棋子分布
      let redPieces = 0;
      let blackPieces = 0;
      let emptySpaces = 0;
      
      for (let sq = 0; sq < 256; sq++) {
        if (isChessOnBoard(sq)) {
          const piece = this.pos.squares[sq];
          if (piece === 0) {
            emptySpaces++;
          } else if ((piece & 8) !== 0) { // 红方棋子
            redPieces++;
          } else if ((piece & 16) !== 0) { // 黑方棋子
            blackPieces++;
          }
        }
      }
      
      console.log(`棋盘统计: 红方=${redPieces}, 黑方=${blackPieces}, 空位置=${emptySpaces}`);
      console.log('=========================');
    };
    
    // 显示样本走法
    this.game._board.showSampleMoves = function(moves, count) {
      console.log(`显示${Math.min(count, moves.length)}个样本走法:`);
      for (let i = 0; i < Math.min(count, moves.length); i++) {
        this.printMoveDetail(moves[i]);
      }
    };
    
    // 打印走法详情
    this.game._board.printMoveDetail = function(move) {
      if (!move) {
        console.log('无效走法');
        return;
      }
      
      const srcPos = getSrcPosFromMotion(move);
      const dstPos = getDstPosFromMotion(move);
      
      const srcPiece = this.pos.squares[srcPos];
      const dstPiece = this.pos.squares[dstPos];
      
      const srcX = srcPos & 15;
      const srcY = srcPos >> 4;
      const dstX = dstPos & 15;
      const dstY = dstPos >> 4;
      
      console.log(`走法详情: ${move}`);
      console.log(`- 源坐标: (${srcX},${srcY}) 位置=${srcPos} 棋子=${srcPiece}(${PIECE_NAME[srcPiece]})`);
      console.log(`- 目标坐标: (${dstX},${dstY}) 位置=${dstPos} ${dstPiece === 0 ? '空位置' : '棋子=' + dstPiece + '(' + PIECE_NAME[dstPiece] + ')'}`);
    };

    // 重写Board的selectedSquare方法，修复选择和移动棋子的问题
    this.game._board.selectedSquare = async function(pos) {
      console.log('Board.selectedSquare 被调用, 坐标:', pos);
      
      // 如果游戏正忙或已结束，则返回
      if (this.busy || this.result !== 0) {
        console.log('游戏正忙或已结束，无法走棋');
        return;
      }

      try {
        // 获取此位置的棋子
        let pc = this.pos.squares[pos];
        console.log('位置上的棋子:', pc, '类型:', pc ? PIECE_NAME[pc] : '空位置');
        
        // 获取当前玩家的棋子标识
        let selfSideTag = this.pos.getSelfSideTag(this.pos.sdPlayer);
        console.log('当前玩家棋子标识:', selfSideTag, '当前玩家:', this.pos.sdPlayer);
        
        // 如果点击的是已选中的棋子，则取消选择
        if (pos === this.sqSelected) {
          console.log('取消选中棋子');
          this.drawSquare(pos, false, pc);
          this.sqSelected = 0;
          self.refreshChessPieces();
          return;
        }
        
        // 如果点击了自己的棋子
        if (pc !== 0 && (pc & selfSideTag) !== 0) {
          console.log('选中自己的棋子');
          self.game.onClickChess();
          
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
          this.drawSquare(pos, true, pc);
          this.sqSelected = pos;
          
          // 刷新棋盘以确保UI更新
          self.refreshChessPieces();
        } 
        // 如果已经选中了一个棋子，并且点击了目标位置
        else if (this.sqSelected > 0) {
          console.log('尝试执行移动，从', this.sqSelected, '到', pos);
          
          // 构造着法
          const move = this.pos.makeMotionBySrcDst(this.sqSelected, pos);
          console.log('构造的着法:', move);
          
          // 检查移动是否合法
          const isLegal = this.pos.legalMove(move);
          console.log('走法是否合法:', isLegal);
          
          if (move > 0 && isLegal) {
            console.log('找到合法走法:', move);
            // 执行移动
            await this.addMove(move, false);
            console.log('移动完成');
          } else {
            console.log('走法不合法');
            self.game.onIllegalMove();
          }
        } 
        // 既不是选中自己的棋子，也不是目标位置
        else {
          console.log('无效点击，未选中己方棋子或点击无效位置');
          self.game.onIllegalMove();
        }
      } catch (error) {
        console.error('处理棋子选择时出错:', error);
        wx.showToast({
          title: '处理出错: ' + error.message,
          icon: 'none',
          duration: 1500
        });
      }
    };
  },
  
  // 重写音效方法
  overrideAudioMethods: function() {
    const self = this;
    
    // 创建一个简单的音效播放函数
    const playSound = function(soundFile) {
      if (self.data.sound) {
        const audioContext = wx.createInnerAudioContext();
        audioContext.src = '../../sounds/' + soundFile;
        audioContext.play();
      }
    };
    
    // 重写各种音效方法
    this.game._audio.playClickSound = function() {
      playSound('click.wav');
    };
    
    this.game._audio.playMoveSound = function() {
      playSound('move.wav');
    };
    
    this.game._audio.playAIMoveSound = function() {
      playSound('move2.wav');
    };
    
    this.game._audio.playCaptureSound = function() {
      playSound('capture.wav');
    };
    
    this.game._audio.playCheckSound = function() {
      playSound('check.wav');
    };
    
    this.game._audio.playWinSound = function() {
      playSound('win.wav');
    };
    
    this.game._audio.playLoseSound = function() {
      playSound('loss.wav');
    };
    
    this.game._audio.playDrawSound = function() {
      playSound('draw.wav');
    };
    
    this.game._audio.playNewGameSound = function() {
      playSound('newgame.wav');
    };
    
    this.game._audio.playIllegalSound = function() {
      playSound('illegal.wav');
    };
  },
  
  /**
   * 处理用户点击棋子
   */
  onChessClick: function (e) {
    try {
      // 从事件数据中获取棋子的逻辑坐标
      const pos = parseInt(e.currentTarget.dataset.pos);
      console.log('点击棋子坐标:', pos);
      
      // 确保游戏已经初始化
      if (!this.game || this.game._board.busy) {
        return;
      }
      
      // 调用游戏处理点击
      this.game.onSelectSquare(pos);
    } catch (error) {
      console.error('处理棋子点击时出错:', error);
    }
  },
  
  // 绘制单个棋子
  drawSquare: function(sq, selected, piece) {
    try {
      if (!isChessOnBoard(sq)) {
        return;
      }
      
      // 如果没有提供piece参数，从棋盘获取
      if (piece === undefined) {
        piece = this.game._board.pos.squares[sq];
      }
      
      // 从预计算的坐标点获取UI位置
      const pointIndex = this.data.boardPoints.findIndex(p => p.pos === sq);
      if (pointIndex === -1) {
        console.error('找不到对应的坐标点:', sq);
        return;
      }
      
      const point = this.data.boardPoints[pointIndex];
      const uiX = point.uiX;
      const uiY = point.uiY;
      
      // 创建棋子数据
      const pieceData = {
        sq: sq,
        imgName: PIECE_NAME[piece] || 'oo',
        selected: selected,
        left: uiX,
        top: uiY
      };
      
      // 找到当前棋子的索引
      let pieces = this.data.chessPieces.slice(); // 创建副本
      let index = pieces.findIndex(p => p && p.sq === sq);
      
      if (piece === 0) {
        // 如果是空棋子，移除它
        if (index !== -1) {
          pieces.splice(index, 1);
        }
      } else {
        if (index !== -1) {
          // 更新现有棋子
          pieces[index] = pieceData;
        } else {
          // 添加新棋子
          pieces.push(pieceData);
        }
      }
      
      // 更新棋盘点的状态
      let boardPoints = this.data.boardPoints.slice();
      boardPoints[pointIndex] = {
        ...point,
        hasPiece: piece !== 0
      };
      
      // 更新UI
      this.setData({ 
        chessPieces: pieces,
        boardPoints: boardPoints
      });
    } catch (error) {
      console.error('绘制棋子时出错:', error);
      wx.showToast({
        title: '绘制棋子出错: ' + error.message,
        icon: 'none',
        duration: 1500
      });
    }
  },
  
  // 刷新棋盘上的所有棋子
  refreshChessPieces: function() {
    try {
      const board = this.game._board;
      let pieces = [];
      
      // 创建一个临时Map来记录每个坐标点是否有棋子
      const posMap = new Map();
      
      // 遍历棋盘上的所有位置
      for (let sq = 0; sq < 256; sq++) {
        if (isChessOnBoard(sq)) {
          const piece = board.pos.squares[sq];
          
          // 计算UI位置
          const uiX = this.getUiXFromPos(sq);
          const uiY = this.getUiYFromPos(sq);
          
          // 检查是否被选中
          const isSelected = sq === board.sqSelected;
          const isLastMove = board.lastMotion && 
                           (sq === getSrcPosFromMotion(board.lastMotion) || 
                            sq === getDstPosFromMotion(board.lastMotion));
          const selected = isSelected || isLastMove;
          
          // 记录此位置是否有棋子
          posMap.set(sq, piece !== 0);
          
          // 只添加有棋子的位置
          if (piece !== 0) {
            // 获取棋子类型
            const pieceType = PIECE_NAME[piece];
            
            // 添加到棋子数组
            pieces.push({
              sq: sq,
              imgName: pieceType,
              selected: selected,
              left: uiX,
              top: uiY
            });
          }
        }
      }
      
      // 更新棋盘坐标点状态
      const updatedBoardPoints = this.data.boardPoints.map(point => {
        return {
          ...point,
          hasPiece: posMap.get(point.pos) || false
        };
      });
      
      // 更新UI
      this.setData({ 
        chessPieces: pieces,
        boardPoints: updatedBoardPoints
      });
    } catch (error) {
      console.error('刷新棋盘时出错:', error);
      wx.showToast({
        title: '刷新棋盘出错: ' + error.message,
        icon: 'none',
        duration: 1500
      });
    }
  },
  
  // 计算UI坐标X - 处理坐标转换
  getUiXFromPos: function(pos) {
    const x = getChessPosX(pos);
    if (x < 3 || x > 11) {
      return UI_BOARD_LEFT;
    }
    return UI_BOARD_LEFT + (x - 3) * UI_CCHESS_SIZE;
  },
  
  // 计算UI坐标Y - 处理坐标转换
  getUiYFromPos: function(pos) {
    const y = getChessPosY(pos);
    if (y < 3 || y > 12) {
      return UI_BOARD_TOP;
    }
    return UI_BOARD_TOP + (y - 3) * UI_CCHESS_SIZE;
  },

  // 走棋列表选择改变事件
  onRecordListChange: function(e) {
    const index = e.detail.value;
    this.setData({
      selMoveIndex: index
    });
    
    const board = this.game.getBoard();
    // 实现历史记录回溯
    const from = board.pos.motionList.length;
    const to = index;
    
    if (from == to + 1) {
      return;
    }

    if (from > to + 1) {
      for (let i = to + 1; i < from; i++) {
        board.pos.undoMakeMove();
      }
    } else {
      for (let i = from; i <= to; i++) {
        board.pos.makeMove(parseInt(this.data.moveList[i].value));
      }
    }
    
    board.flushBoard();
  },

  // 列表滚动到底部事件
  onScrollToBottom: function() {
    console.log("滚动到底部");
  },

  // "谁先走"选项改变事件
  onSelMoveModeChange: function(e) {
    let index = e.detail.value;
    this.setData({
      moveModeIndex: index,
      aiVsAiMode: index === 3 // 索引3是AI对战AI
    });
    
    // 设置电脑方
    if (index === 0) {
      this.game._board.computer = 1; // 电脑执黑
    } else if (index === 1) {
      this.game._board.computer = 0; // 电脑执红
    } else if (index === 2) {
      this.game._board.computer = -1; // 不用电脑
    } else if (index === 3) {
      this.game._board.computer = 2; // AI对战AI模式
      wx.showToast({
        title: 'AI对战AI模式已开启',
        icon: 'success',
        duration: 1500
      });
    }
  },

  // "先走让子"选项改变事件
  onSelHandicapChange: function(e) {
    let index = e.detail.value;
    this.setData({
      handicapIndex: index
    });
  },

  // "重新开始"按钮事件
  onClickRestart: function() {
    console.log("点击重新开始");
    
    // 重置走棋列表
    this.setData({
      moveList: ['=== 开始 ==='],
      selMoveIndex: 0
    });
    
    // 设置电脑方
    const moveMode = this.data.moveModeIndex;
    if (moveMode === 0) {
      this.game._board.computer = 1; // 电脑执黑
    } else if (moveMode === 1) {
      this.game._board.computer = 0; // 电脑执红
    } else if (moveMode === 2) {
      this.game._board.computer = -1; // 不用电脑
    } else if (moveMode === 3) {
      // 移除AI对战AI模式
      this.game._board.computer = 1; // 默认电脑执黑
      this.setData({
        moveModeIndex: 0, // 改为我先走
        aiVsAiMode: false
      });
    }
    
    // 重新开始游戏
    this.game.restartGame(STARTUP_FEN[this.data.handicapIndex]);
    
    // 刷新棋盘确保UI更新
    this.refreshChessPieces();
    
    // 打印棋盘状态
    this.game._board.printBoardState();
    
    // 如果是电脑先走，主动调用响应方法
    if (this.game._board.computerMove()) {
      console.log("电脑先走，调用response方法");
      setTimeout(() => {
        this.game._board.response();
      }, 500);
    }
  },

  // 悔棋按钮事件
  onClickRetract: function() {
    try {
      console.log("执行悔棋操作");
      
      // 获取棋盘实例
      const board = this.game._board;
      
      // 检查游戏状态
      if (board.busy || board.result !== 0) {
        console.log("游戏正忙或已结束，不能悔棋");
        return;
      }
      
      // 保存当前状态
      const currentPlayer = board.pos.sdPlayer;
      console.log("当前玩家:", currentPlayer);
      
      // 如果走棋列表为空或只有开始项，无法悔棋
      if (this.data.moveList.length <= 1) {
        console.log("没有可悔的棋");
        wx.showToast({
          title: '没有可悔的棋',
          icon: 'none',
          duration: 1500
        });
        return;
      }
      
      // 如果是电脑对战，需要悔棋两步
      const needUndoTwice = board.computer >= 0;
      
      // 执行悔棋，如果是电脑对战模式，撤销两步
      let undoCount = needUndoTwice ? 2 : 1;
      let success = false;
      
      for (let i = 0; i < undoCount; i++) {
        if (board.pos.motionList.length > 0) {
          board.pos.undoMakeMove();
          success = true;
        } else {
          break;
        }
      }
      
      if (success) {
        // 更新走棋列表
        const moveListLength = this.data.moveList.length;
        const newLength = moveListLength - undoCount;
        const moveList = this.data.moveList.slice(0, Math.max(1, newLength));
        
        this.setData({
          moveList: moveList,
          selMoveIndex: moveList.length - 1
        });
        
        // 重置选中的棋子
        board.sqSelected = 0;
        
        // 刷新棋盘
        this.refreshChessPieces();
        
        console.log("悔棋成功");
      } else {
        console.log("悔棋失败");
        wx.showToast({
          title: '悔棋失败',
          icon: 'none',
          duration: 1500
        });
      }
    } catch (error) {
      console.error("悔棋操作出错:", error);
      wx.showToast({
        title: '悔棋出错: ' + error.message,
        icon: 'none',
        duration: 1500
      });
    }
  },

  // "电脑水平"选项改变事件
  onSelLevelChange: function(e) {
    const index = e.detail.value;
    this.setData({
      levelIndex: index
    });
    
    // 基于选择的难度设置思考时间和深度
    let depthLevel, timeLevel;
    
    switch(index) {
      case 0: // 入门
        depthLevel = 1;
        timeLevel = 2;
        break;
      case 1: // 业余
        depthLevel = 3;
        timeLevel = 5;
        break;
      case 2: // 专业
        depthLevel = 5;
        timeLevel = 8;
        break;
    }
    
    this.setData({
      depthLevel: depthLevel,
      timeLevel: timeLevel
    });
    
    this.updateAISettings();
  },

  // 切换动画效果
  onAnimatedChange: function(e) {
    let value = e.detail.value;
    this.setData({
      animated: value
    });
    this.game.setAnimated(value);
  },

  // 切换音效
  onSoundChange: function(e) {
    let value = e.detail.value;
    this.setData({
      sound: value
    });
    this.game.setSound(value);
  },

  // 辅助函数：将UI坐标转换为棋盘坐标
  convertUiToBoardPos: function(uiX, uiY) {
    const relativeX = uiX - UI_BOARD_LEFT;
    const relativeY = uiY - UI_BOARD_TOP;
    
    let boardX = Math.floor(relativeX / UI_CCHESS_SIZE) + 3;
    let boardY = Math.floor(relativeY / UI_CCHESS_SIZE) + 3;
    
    boardX = Math.max(3, Math.min(boardX, 11));
    boardY = Math.max(3, Math.min(boardY, 12));
    
    return boardX + (boardY << 4);
  },

  // 自定义的isChessOnBoard函数，确保坐标始终有效
  isValidChessPos: function(pos) {
    // 提取坐标
    const x = pos & 15;  // 取低4位作为X坐标
    const y = pos >> 4;  // 高4位右移作为Y坐标
    
    // 检查是否在有效范围内
    return x >= 3 && x <= 11 && y >= 3 && y <= 12;
  },
  
  /**
   * 显示点击位置详细信息
   */
  showPosInfo: function(boardX, boardY, pos, piece) {
    // 检查该位置是否有棋子
    const isPiece = piece !== 0;
    const pieceName = isPiece ? PIECE_NAME[piece] : '空';
    
    // 创建信息字符串
    let info = `坐标(${boardX},${boardY})\n一维坐标: ${pos}\n`;
    info += isPiece ? `${pieceName}棋子` : '空位置';
    
    // 显示弹窗
    wx.showModal({
      title: '位置信息',
      content: info,
      showCancel: false,
      confirmText: '关闭'
    });
  },
  
  /**
   * 调试函数：打印棋盘坐标系统信息
   */
  debugChessboardCoordinates: function() {
    console.log("===== 棋盘坐标系统信息 =====");
    console.log("棋盘大小:", UI_BOARD_WIDTH, "x", UI_BOARD_HEIGHT);
    console.log("棋子大小:", UI_CCHESS_SIZE);
    console.log("棋盘边距:", UI_BOARD_LEFT, UI_BOARD_TOP);
    
    // 打印棋盘的有效区域
    const leftEdge = UI_BOARD_LEFT;
    const rightEdge = UI_BOARD_LEFT + UI_CCHESS_SIZE * 9;
    const topEdge = UI_BOARD_TOP;
    const bottomEdge = UI_BOARD_TOP + UI_CCHESS_SIZE * 10;
    
    console.log("棋盘有效区域:", 
                "左:", leftEdge, 
                "右:", rightEdge, 
                "上:", topEdge, 
                "下:", bottomEdge);
    
    // 打印一些示例坐标
    for (let x = 3; x <= 11; x += 4) {
      for (let y = 3; y <= 12; y += 3) {
        const pos = x + (y << 4);
        const uiX = this.getUiXFromPos(pos);
        const uiY = this.getUiYFromPos(pos);
        console.log(`棋盘坐标(${x},${y}) -> 一维坐标${pos} -> UI坐标(${uiX},${uiY})`);
      }
    }
    console.log("===========================");
  },

  // 校准棋盘坐标系统
  calibrateChessboard: function() {
    console.log("===== 棋盘坐标系统校准 =====");
    
    // 打印棋盘尺寸和位置
    console.log("棋盘尺寸:", UI_BOARD_WIDTH, "x", UI_BOARD_HEIGHT);
    console.log("棋子尺寸:", UI_CCHESS_SIZE);
    console.log("棋盘边距:", UI_BOARD_LEFT, UI_BOARD_TOP);
    
    // 打印棋盘有效区域
    const validLeft = UI_BOARD_LEFT;
    const validRight = UI_BOARD_LEFT + UI_CCHESS_SIZE * 9;
    const validTop = UI_BOARD_TOP;
    const validBottom = UI_BOARD_TOP + UI_CCHESS_SIZE * 10;
    
    console.log("棋盘有效区域:", 
                "左:", validLeft, 
                "右:", validRight, 
                "上:", validTop, 
                "下:", validBottom);
    
    // 测试坐标转换 - 棋盘的四个角
    console.log("左上角坐标测试:");
    this.testCoordinateConversion(validLeft, validTop);
    
    console.log("右上角坐标测试:");
    this.testCoordinateConversion(validRight - 1, validTop);
    
    console.log("左下角坐标测试:");
    this.testCoordinateConversion(validLeft, validBottom - 1);
    
    console.log("右下角坐标测试:");
    this.testCoordinateConversion(validRight - 1, validBottom - 1);
    
    // 测试一个中间位置
    console.log("中间位置坐标测试:");
    this.testCoordinateConversion(
      validLeft + UI_CCHESS_SIZE * 4.5,
      validTop + UI_CCHESS_SIZE * 5
    );
    
    console.log("===========================");
  },
  
  // 测试坐标转换
  testCoordinateConversion: function(x, y) {
    console.log(`测试点击坐标: (${x}, ${y})`);
    
    // 相对坐标
    const relativeX = x - UI_BOARD_LEFT;
    const relativeY = y - UI_BOARD_TOP;
    console.log(`相对于棋盘左上角的坐标: (${relativeX}, ${relativeY})`);
    
    // 计算棋盘格子坐标
    const boardX = Math.floor(relativeX / UI_CCHESS_SIZE) + 3;
    const boardY = Math.floor(relativeY / UI_CCHESS_SIZE) + 3;
    console.log(`计算得到的棋盘坐标: (${boardX}, ${boardY})`);
    
    // 检查坐标是否在有效范围内
    const isValid = boardX >= 3 && boardX <= 11 && boardY >= 3 && boardY <= 12;
    console.log(`坐标有效性: ${isValid}`);
    
    if (isValid) {
      // 转换为一维坐标
      const pos = boardX + (boardY << 4);
      console.log(`对应的一维坐标: ${pos}`);
      
      // 反向转换测试
      const uiX = this.getUiXFromPos(pos);
      const uiY = this.getUiYFromPos(pos);
      console.log(`反向转换得到的UI坐标: (${uiX}, ${uiY})`);
      
      // 计算误差
      const errorX = uiX - (UI_BOARD_LEFT + (boardX - 3) * UI_CCHESS_SIZE);
      const errorY = uiY - (UI_BOARD_TOP + (boardY - 3) * UI_CCHESS_SIZE);
      console.log(`坐标误差: (${errorX}, ${errorY})`);
    }
  },

  // 添加调试棋盘状态的方法
  debugBoardState: function() {
    console.log("===== 调试棋盘状态 =====");
    
    const board = this.game._board;
    console.log("当前玩家:", board.pos.sdPlayer, "(0=黑方,1=红方)");
    console.log("电脑控制:", board.computer, "(-1=无,0=红方,1=黑方)");
    console.log("当前选中棋子:", board.sqSelected);
    
    // 分析棋子分布
    let redPieces = [];
    let blackPieces = [];
    
    for (let sq = 0; sq < 256; sq++) {
      if (isChessOnBoard(sq)) {
        const piece = board.pos.squares[sq];
        if (piece !== 0) {
          const x = getChessPosX(sq);
          const y = getChessPosY(sq);
          const pieceName = PIECE_NAME[piece];
          
          if ((piece & 8) !== 0) { // 红方棋子
            redPieces.push({
              name: pieceName,
              pos: sq,
              x: x,
              y: y,
              half: board.pos.isSelfHalf(sq, 1) ? "己方半区" : "敌方半区"
            });
          } else if ((piece & 16) !== 0) { // 黑方棋子
            blackPieces.push({
              name: pieceName,
              pos: sq,
              x: x,
              y: y,
              half: board.pos.isSelfHalf(sq, 0) ? "己方半区" : "敌方半区"
            });
          }
        }
      }
    }
    
    console.log("红方棋子:", redPieces);
    console.log("黑方棋子:", blackPieces);
    
    // 测试几个关键位置的走法
    const testPositions = redPieces.concat(blackPieces).slice(0, 5); // 测试前5个棋子
    for (const piece of testPositions) {
      console.log(`测试${piece.name}(${piece.pos})的合法走法:`);
      const moves = board.pos.generatePlayerMoves();
      const validMoves = moves.filter(mv => getSrcPosFromMotion(mv) === piece.pos);
      
      if (validMoves.length > 0) {
        validMoves.forEach(mv => {
          const dst = getDstPosFromMotion(mv);
          const dstX = getChessPosX(dst);
          const dstY = getChessPosY(dst);
          console.log(`可以移动到(${dstX},${dstY}), 坐标:${dst}`);
        });
      } else {
        console.log("没有合法走法");
      }
    }
    
    // 检查走子规则
    console.log("检查isSelfHalf和isEnemyHalf函数的行为:");
    for (let y = 3; y <= 12; y++) {
      let row = "";
      for (let x = 3; x <= 11; x++) {
        const pos = x + (y << 4);
        if (board.pos.isSelfHalf(pos, 0)) {
          row += "0"; // 黑方己方区域
        } else if (board.pos.isEnemyHalf(pos, 0)) {
          row += "X"; // 黑方敌方区域
        } else {
          row += "-"; // 中立区域
        }
      }
      console.log(`${y}: ${row}`);
    }
    
    console.log("===========================");
    
    wx.showToast({
      title: '棋盘状态已输出到控制台',
      icon: 'none',
      duration: 2000
    });
  },

  // 添加一个显示棋盘为9x10矩阵的方法
  showBoardMatrix: function() {
    console.log("===== 棋盘9x10矩阵 =====");
    // 创建矩阵
    const matrix = [];
    
    for (let y = 3; y <= 12; y++) {
      const row = [];
      for (let x = 3; x <= 11; x++) {
        const pos = x + (y << 4);
        const piece = this.game._board.pos.squares[pos];
        // 使用PIECE_NAME获取棋子名称，或者用"空"表示空位置
        row.push(piece === 0 ? "空" : PIECE_NAME[piece]);
      }
      matrix.push(row);
    }
    
    // 打印矩阵
    console.log("每行从左到右，每列从上到下");
    for (let i = 0; i < matrix.length; i++) {
      console.log(`行${i+3}: ${matrix[i].join(', ')}`);
    }
    console.log("=======================");
    
    wx.showToast({
      title: '棋盘矩阵已输出到控制台',
      icon: 'none',
      duration: 1500
    });
    
    return matrix;
  },
  
  // 添加主动测试AI走空位置的功能
  testAIMoveToEmpty: function() {
    // 先显示棋盘
    const matrix = this.showBoardMatrix();
    
    // 获取棋盘对象
    const board = this.game._board;
    
    // 检查当前是否已经是AI回合
    if (!board.computerMove()) {
      console.log("当前不是AI回合，先进行一次人类移动");
      // 这里可以添加一段自动走棋的代码
    }
    
    // 看看AI能生成哪些走法
    console.log("生成AI可能的走法：");
    const allMoves = board.pos.generateMoves();
    
    // 找到目标是空位置的走法
    const movesToEmpty = allMoves.filter(move => {
      const dstPos = getDstPosFromMotion(move);
      return board.pos.squares[dstPos] === 0; // 目标是空位置
    });
    
    console.log(`找到${movesToEmpty.length}个移动到空位置的走法`);
    
    // 打印前5个移动到空位置的走法
    if (movesToEmpty.length > 0) {
      board.showSampleMoves(movesToEmpty, 5);
    }
    
    // 让AI走这一步
    board.response();
  },

  // 添加测试移动逻辑的按钮事件处理函数
  testMovePiece: function() {
    try {
      console.log('===== 测试移动函数 =====');
      const board = this.game._board;
      
      // 打印当前棋盘状态
      board.printBoardState();
      
      // 选择一个红方棋子进行测试（假设是红方先行）
      let testPiece = null;
      let testPiecePos = 0;
      
      // 查找一个红方兵（卒）作为测试
      for (let sq = 0; sq < 256; sq++) {
        if (isChessOnBoard(sq)) {
          const pc = board.pos.squares[sq];
          if (pc === 14) { // 红方兵
            testPiece = pc;
            testPiecePos = sq;
            break;
          }
        }
      }
      
      if (!testPiece) {
        console.log('找不到可测试的棋子');
        return;
      }
      
      console.log('找到测试棋子:', PIECE_NAME[testPiece], '位置:', testPiecePos);
      
      // 计算这个棋子的所有可能走法
      const allMoves = board.pos.generateMoves(null);
      console.log('棋盘上所有可能的走法数量:', allMoves.length);
      
      // 筛选出这个棋子的走法
      const pieceMoves = allMoves.filter(mv => {
        return getSrcPosFromMotion(mv) === testPiecePos;
      });
      
      console.log('该棋子的可能走法数量:', pieceMoves.length);
      
      // 测试每一个走法
      pieceMoves.forEach((mv, index) => {
        const dstPos = getDstPosFromMotion(mv);
        const dstPc = board.pos.squares[dstPos];
        
        console.log(`走法 ${index + 1}:`);
        console.log(`- 着法值: ${mv}`);
        console.log(`- 目标位置: ${dstPos}`);
        console.log(`- 目标位置棋子: ${dstPc ? PIECE_NAME[dstPc] : '空'}`);
        
        // 测试makeMotionBySrcDst函数
        const testMv = board.pos.makeMotionBySrcDst(testPiecePos, dstPos);
        console.log(`- makeMotionBySrcDst结果: ${testMv}`);
        console.log(`- 是否与原着法匹配: ${testMv === mv}`);
        
        // 测试legalMove函数
        const isLegal = board.pos.legalMove(testMv);
        console.log(`- 是否合法: ${isLegal}`);
      });
      
      console.log('=========================');
      
      wx.showToast({
        title: '已完成移动函数测试，请查看控制台',
        icon: 'none',
        duration: 2000
      });
    } catch (error) {
      console.error('测试移动函数时出错:', error);
      wx.showToast({
        title: '测试出错: ' + error.message,
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 添加测试移动逻辑按钮
  testMoveLogic: function() {
    this.testMovePiece();
  },

  // 显示所有坐标点信息
  showAllBoardPoints: function() {
    try {
      // 先确保坐标点可见
      this.setData({ showBoardPoints: true });
      
      // 创建一个用于显示的表格
      let message = "棋盘坐标点信息:\n";
      message += "行\\列";
      
      // 添加列标题 (0-8)
      for (let x = 0; x <= 8; x++) {
        message += `\t${x}`;
      }
      
      // 添加每一行数据
      for (let y = 0; y <= 9; y++) {
        message += `\n${y}`;
        
        for (let x = 0; x <= 8; x++) {
          // 计算棋盘坐标
          const boardX = x + 3;
          const boardY = y + 3;
          const pos = boardX + (boardY << 4);
          
          // 找到对应的坐标点
          const point = this.data.boardPoints.find(p => p.pos === pos);
          
          if (point) {
            // 在表格中添加坐标点信息
            message += `\t${pos}`;
          } else {
            message += `\t-`;
          }
        }
      }
      
      console.log(message);
      
      // 显示提示
      wx.showModal({
        title: '棋盘坐标点信息',
        content: '所有坐标点信息已输出到控制台，请查看',
        showCancel: false
      });
    } catch (error) {
      console.error('显示坐标点信息出错:', error);
    }
  },

  // 侧边栏控制
  toggleSidebar() {
    this.setData({
      sidebarVisible: !this.data.sidebarVisible
    });
  },
  
  // 增强的AI难度设置
  onDepthLevelChange(e) {
    this.setData({
      depthLevel: e.detail.value
    });
    this.updateAISettings();
  },

  onTimeLevelChange(e) {
    this.setData({
      timeLevel: e.detail.value
    });
    this.updateAISettings();
  },

  updateAISettings() {
    try {
      const { depthLevel, timeLevel } = this.data;
      
      // 思考时间（毫秒）设置，基于深度和时间
      const baseTimeMs = 100;
      const thinkTimeMs = baseTimeMs * Math.pow(2, timeLevel);
      
      console.log(`设置AI难度 - 深度:${depthLevel}, 时间:${thinkTimeMs}ms`);
      
      // 设置AI思考时间
      if (this.game) {
        this.game.setMaxThinkTimeMs(thinkTimeMs);
      }
    } catch (error) {
      console.error('更新AI设置时出错:', error);
    }
  },

  // 将军提示
  showCheckAlert() {
    this.setData({
      showCheckAlert: true
    });
    
    setTimeout(() => {
      this.setData({
        showCheckAlert: false
      });
    }, 1500);
  },
});
