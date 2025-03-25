// 在 app.js 文件最顶部添加 polyfill 代码
if (typeof EventTarget === 'undefined') {
  class EventTarget {
    constructor() {
      this.listeners = {};
    }
    addEventListener(type, callback) {
      if (!this.listeners[type]) {
        this.listeners[type] = [];
      }
      this.listeners[type].push(callback);
    }
    removeEventListener(type, callback) {
      if (!this.listeners[type]) return;
      const stack = this.listeners[type];
      for (let i = 0; i < stack.length; i++) {
        if (stack[i] === callback) {
          stack.splice(i, 1);
          return;
        }
      }
    }
    dispatchEvent(event) {
      if (!this.listeners[event.type]) return true;
      const stack = this.listeners[event.type].slice();
      for (let i = 0; i < stack.length; i++) {
        stack[i].call(this, event);
      }
      return !event.defaultPrevented;
    }
  }
  globalThis.EventTarget = EventTarget;
}

// 然后是你的 App 初始化代码
App({
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || [];
    logs.unshift(Date.now());
    wx.setStorageSync('logs', logs);

    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      }
    });
  },
  globalData: {
    userInfo: null
  }
});
