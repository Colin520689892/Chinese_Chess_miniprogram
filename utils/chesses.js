// utils/chesses.js
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

class Dir {
  constructor(dx, dy) {
    this.dx = dx;
    this.dy = dy;
  }
}

const d1 = new Dir(0, 1);   // 横
const d2 = new Dir(1, 0);   // 竖
const d3 = new Dir(1, -1);  // 撇
const d4 = new Dir(1, 1);   // 捺

class Chesses {
  constructor() {
    this.board = Array.from({ length: 15 }, () => Array(15).fill(0)); // 初始化棋盘
    this.player = 0;
    this.computer = 0;
    this.N = 0;
    this.newPoint = new Point(0, 0);
  }


  turnPlayer() {
    // 玩家走棋
  }

  turnComputer() {
    // 计算机走棋
  }

  // 判断点是否在棋盘内
	isInBoard(point) {
  	return point.x >= 0 && point.x < 15 && point.y >= 0 && point.y < 15;
	}


  score(p, myColor) {
    // 评估函数
  }

  newPointFunc(p, d, length) {
    // 计算新点
    return new Point(p.x + d.dx * length, p.y + d.dy * length);
  }

  isEnd() {
    // 判断是否五子
  }

  play() {
    // 开始
  }

  connect(a, b) {
    // 两个队列相连接
    return [...a, ...b];
  }

  gen() {
    // 已下棋子周围两格范围内为预下点
  }

  min(depth, score, alpha, beta) {
    // 极小值搜索及剪枝
  }

  max(depth, score, alpha, beta) {
    // 极大值搜索及剪枝
  }

  maxMin(depth) {
    // 极大极小搜索及剪枝
  }
}

module.exports = Chesses;
