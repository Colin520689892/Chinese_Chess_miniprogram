// Polyfill for CustomEvent if not available
if (typeof CustomEvent === "undefined") {
    (function () {
      function CustomEvent(event, params) {
        params = params || { bubbles: false, cancelable: false, detail: null };
        var evt;
        if (typeof document !== "undefined" && document.createEvent) {
          evt = document.createEvent("CustomEvent");
          evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
        } else {
          // 简易实现，仅用于事件传递
          evt = { type: event, detail: params.detail, bubbles: params.bubbles, cancelable: params.cancelable };
        }
        return evt;
      }
      CustomEvent.prototype = (typeof Event !== "undefined" ? Event.prototype : {});
      globalThis.CustomEvent = CustomEvent;
    })();
  }
  
  /**
   * 音频处理
   */
  
  const WAV = Object.freeze({
    DRAW: "draw",
    CHECK: "check",
    CAPTURE: "capture",
    MOVE: "move",
    CLICK: "click",
    NEWGAME: "newgame",
    ILLEGAL: "illegal",
    LOSS: "loss",
    WIN: "win",
    CHECK2: "check2",
    CAPTURE2: "capture2",
    MOVE2: "move2",
  });
  
  export class GameAudio extends EventTarget {
    constructor(game, soundPath) {
      super();
      this._game = game;
      this._soundPath = soundPath;
  
      // 如果在浏览器环境中，则创建 dummy 元素以便用于 embed 回退
      if (typeof document !== "undefined") {
        this.dummy = document.createElement("div");
        this.dummy.style.position = "absolute";
        document.body.appendChild(this.dummy);
      } else {
        this.dummy = null;
      }
  
      // 测试事件通知机制
      this.addEventListener('test', (e) => {
        console.log(e.type, e.detail);
      }, false);
  
      this.dispatchEvent(new CustomEvent('test', { detail: { name: "123" } }));
    }
  
    playDrawSound() {
      this.playSound(WAV.DRAW);
    }
  
    playCheckSound() {
      this.playSound(WAV.CHECK);
    }
  
    playCaptureSound() {
      this.playSound(WAV.CAPTURE);
    }
  
    playMoveSound() {
      this.playSound(WAV.MOVE);
    }
  
    playClickSound() {
      this.playSound(WAV.CLICK);
    }
  
    playNewGameSound() {
      this.playSound(WAV.NEWGAME);
    }
  
    playIllegalSound() {
      this.playSound(WAV.ILLEGAL);
    }
  
    playLoseSound() {
      this.playSound(WAV.LOSS);
    }
  
    playWinSound() {
      this.playSound(WAV.WIN);
    }
  
    playAICheckSound() {
      this.playSound(WAV.CHECK2);
    }
  
    playAICaptureSound() {
      this.playSound(WAV.CAPTURE2);
    }
  
    playAIMoveSound() {
      this.playSound(WAV.MOVE2);
    }
  
    playSound(soundFile) {
      if (!this._soundPath || !this._game.getSound()) {
        return;
      }
  
      const src = this._soundPath + soundFile + ".wav";
  
      // 微信小程序环境下使用 wx.createInnerAudioContext 播放音频
      if (typeof wx !== 'undefined' && wx.createInnerAudioContext) {
        const audio = wx.createInnerAudioContext();
        audio.src = src;
        audio.play();
      }
      // 浏览器环境下使用 Audio 对象播放
      else if (typeof Audio !== 'undefined') {
        try {
          new Audio(src).play();
        } catch (e) {
          // 回退方案：使用 embed 标签（仅在浏览器有效）
          if (this.dummy) {
            this.dummy.innerHTML = `<embed src="${src}" hidden="true" autostart="true" loop="false"/>`;
          }
        }
      }
    }
  }
  