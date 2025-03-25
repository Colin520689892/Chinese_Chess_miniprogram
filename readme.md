# 中国象棋小程序优化说明
体验地址
![e7617c99a4cf99c278307c7dd02e417](https://github.com/user-attachments/assets/af239357-d7ff-4286-9488-76d1f0f72ee8)


## 1. 棋子定位逻辑修改

我们对中国象棋小程序进行了优化，主要关注棋子的定位逻辑。修改内容如下：

### 1.1 尺寸适配

- 定义了原始棋盘和棋子的尺寸：
  ```js
  const ORIGINAL_UI_BOARD_WIDTH = 521;  // 原始棋盘宽度
  const ORIGINAL_UI_BOARD_HEIGHT = 577; // 原始棋盘高度
  const ORIGINAL_UI_CCHESS_SIZE = 57;   // 原始棋子大小
  ```

- 应用缩放比例以适应小程序屏幕：
  ```js
  const SCALE_RATIO = 0.55; // 缩放比例
  
  const UI_BOARD_WIDTH = Math.floor(ORIGINAL_UI_BOARD_WIDTH * SCALE_RATIO);
  const UI_BOARD_HEIGHT = Math.floor(ORIGINAL_UI_BOARD_HEIGHT * SCALE_RATIO);
  const UI_CCHESS_SIZE = Math.floor(ORIGINAL_UI_CCHESS_SIZE * SCALE_RATIO);
  ```

### 1.2 边距计算

- 计算棋盘边距，使棋子能够按照棋盘格子正确对齐：
  ```js
  const UI_BOARD_LEFT = Math.floor((UI_BOARD_WIDTH - UI_CCHESS_SIZE * 9) / 2);
  const UI_BOARD_TOP = Math.floor((UI_BOARD_HEIGHT - UI_CCHESS_SIZE * 10) / 2);
  ```

### 1.3 棋子定位函数

- 优化了棋子位置计算函数：
  ```js
  // 计算UI坐标X
  getUiXFromPos: function(pos) {
    // 获取棋子在棋盘中的X坐标(3-11)
    const x = getChessPosX(pos);
    // 计算相对于棋盘左边缘的偏移量
    return UI_BOARD_LEFT + (x - 3) * UI_CCHESS_SIZE;
  },
  
  // 计算UI坐标Y
  getUiYFromPos: function(pos) {
    // 获取棋子在棋盘中的Y坐标(3-12)
    const y = getChessPosY(pos);
    // 计算相对于棋盘上边缘的偏移量
    return UI_BOARD_TOP + (y - 3) * UI_CCHESS_SIZE;
  }
  ```

## 2. 游戏逻辑优化

### 2.1 棋子选择和移动

- 在 Game 类中添加了 `onSelectSquare` 方法以处理棋子点击：
  ```js
  onSelectSquare(sq) {
    // 处理棋子选择逻辑
    // 根据当前状态决定是选择棋子还是移动棋子
  }
  ```

- 增加辅助方法处理棋子选择和移动：
  ```js
  trySelectPiece(sq, pc) {
    // 尝试选择棋子
  }
  
  moveSelectedPiece(dstSq) {
    // 尝试移动棋子
  }
  ```

### 2.2 完善 Board 类

- 添加了关键方法以支持游戏进行：
  ```js
  // 添加着法
  addMotion(mv) {
    // 处理走棋
  }
  
  // 处理棋子选中状态
  postSquareSelected() {
    // 更新棋子选中状态的显示
  }
  
  // 悔棋处理
  retract() {
    // 处理悔棋逻辑
  }
  ```

## 3. 界面优化

### 3.1 样式优化

- 完善了样式表（chess.wxss），使用更符合原始版本的样式定义。
- 增加了针对小屏幕的响应式布局，确保在不同尺寸设备上的显示效果。

### 3.2 布局调整

- 优化了棋盘区域和控制区域的布局
- 增加了走棋记录的展示区域

## 4. 音效和动画

- 实现了完整的音效支持：
  ```js
  // 重写各种音效方法
  this.game._audio.playClickSound = function() {
    playSound('click.wav');
  };
  
  this.game._audio.playMoveSound = function() {
    playSound('move.wav');
  };
  
  // ... 其他音效
  ```

- 添加了思考中动画和棋子移动动画

## 5. 调试功能

- 增加了详细的调试日志，便于追踪棋子位置问题：
  ```js
  console.log(`棋子${pieces.length}: 类型=${piece}, 位置=${left},${top}, 坐标=(${getChessPosX(flippedSq)},${getChessPosY(flippedSq)})`);
  ```

## 如何使用

1. 运行微信开发者工具
2. 导入本项目
3. 点击"编译"按钮
4. 在模拟器中预览效果或真机调试

如有任何问题，请联系开发者。 
