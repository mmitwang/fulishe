export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/category/index',
    'pages/cart/index',
    'pages/mine/index',
    'pages/product/index',
    'pages/checkout/index',
    'pages/order/index',
    'pages/login/index',
    'pages/trace/index',
    'pages/channel/index',
    'pages/ops/index',
    'pages/card/index'
  ],
  window: {
    backgroundTextStyle: 'dark',
    navigationBarBackgroundColor: '#f7f3ec',
    navigationBarTitleText: '福礼社',
    navigationBarTextStyle: 'black',
    backgroundColor: '#f7f3ec',
    enablePullDownRefresh: false
  },
  tabBar: {
    color: '#8b857c',
    selectedColor: '#a52a2a',
    backgroundColor: '#fffdf9',
    borderStyle: 'white',
    list: [
      { pagePath: 'pages/home/index', text: '首页', iconPath: 'assets/tabbar/home.png', selectedIconPath: 'assets/tabbar/home-selected.png' },
      { pagePath: 'pages/category/index', text: '分类', iconPath: 'assets/tabbar/category.png', selectedIconPath: 'assets/tabbar/category-selected.png' },
      { pagePath: 'pages/cart/index', text: '购物车', iconPath: 'assets/tabbar/cart.png', selectedIconPath: 'assets/tabbar/cart-selected.png' },
      { pagePath: 'pages/mine/index', text: '我的', iconPath: 'assets/tabbar/mine.png', selectedIconPath: 'assets/tabbar/mine-selected.png' }
    ]
  }
})
