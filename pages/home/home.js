// pages/home/home.js
Page({

  data: {

  },

  onLoad(options) {
    wx.showShareMenu({
      withShareTicket: true
    });
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
  gotoGobang(){
    wx.navigateToMiniProgram({
      appId: '',
      path: 'pages/shouye/shouye', 
      extraData: {
        foo: 'bar'
      },
      envVersion: 'release',
      success(res) {
        console.log('跳转成功');
      },
      fail(err) {
        console.log('跳转失败', err);
      }
    });
  },
  gotoChess(){
    wx.navigateTo({
      url: '/pages/chess/chess',
    })
  },
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})
