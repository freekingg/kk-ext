console.info('chrome-ext template-vue-ts background script')

chrome.runtime.onInstalled.addListener(async () => {
  console.log('contextMenus')
  const menus: any = {
    contexts: ['all'],
    id: 'copy',
    title: '复制当前窗口',
  }
  chrome.contextMenus.create(menus) //添加menu菜单
})

setInterval(() => {
  console.log('background')
}, 2000)
let instimer: any = null
let instimer2: any = null
chrome.webNavigation.onErrorOccurred.addListener(
  (details) => {
    console.log('页面加载失败了')
    console.log(details)
    clearTimeout(instimer2)
    instimer2 = setTimeout(() => {
      chrome.tabs.reload(details.tabId)
    }, 5000)
  },
  { url: [{ hostContains: 'instagram.com' }] },
)

chrome.contextMenus.onClicked.addListener((menu) => {
  getCurrentTab().then((tab) => {
    if (tab && tab.id) {
      // chrome.tabs.duplicate(tab.id);
      chrome.windows.create({ url: tab.url, type: 'popup' })
    }
  })
})

// const menus = [
//   'DEMO'
// ]

// menus.forEach((menu, index) => {
//   chrome.contextMenus.create({
//     title: 'menu',
//     id:'1',
//   })
// })

// chrome.contextMenus.onClicked.addListener((r)=>{
//   getCurrentTab().then((tab)=>{
//     console.log('tab: ', tab);
//     if(tab && tab.id){
//       chrome.tabs.sendMessage(tab.id, { greeting: "hello" },(response)=>{
//         console.log('response: ', response);
//         // 回复 response
//       })
//     }
//     });
// })

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab
}

async function getCurrentWindow() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab
}

/**
 * 监听tab页面变化
 */
chrome.tabs.onUpdated.addListener(function (
  tabId: number,
  changeInfo: chrome.tabs.TabChangeInfo,
  tab: chrome.tabs.Tab,
) {
  // console.log('changeInfo: ', changeInfo);
  // console.log('tab: ', tab);
  // if( changeInfo.url == undefined){return false;}

  if (changeInfo.status && tab.status === 'complete') {
    console.log('当前url', tab.url)
    // getCurrentTab().then(()=>{
    //   chrome.tabs.sendMessage(tabId, { tab },(response)=>{
    //     // 回复 response
    //   })
    // });
  }
})

/**
 * 监听消息通信
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('后台监听消息request: ', request)
  console.log('后台监听消息sender: ', sender)
  switch (request.type) {
    case 'FETCH_DATA':
      fetch(request.data.reportUrl, {
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key: request.data.fetchKey }),
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
      }).then((res) => {
        // 这里解析body
        return res.text()
      })
      //
      sendResponse({ id: sender.tab?.windowId })
      return true
    case 'START_INS':
      console.log('START_INS: ');
      clearInterval(instimer)
      instimer = setInterval(() => {
        if(sender.tab?.id){
          chrome.tabs.reload(sender.tab?.id)
        }
      }, request.data.intervalTime * 1000 || 30000)
      return true
    case 'STOP_INS':
      console.log('STOP_INS: ');
      clearInterval(instimer)
      return true
    case 'POPUP_INIT':
      getCurrentTab().then(() => {
        sendResponse({ result: 'success' })
      })
      return true
    case 'GET_TAB':
      getCurrentWindow().then((tab) => {
        sendResponse(tab)
      })
      //
      sendResponse({ id: sender.tab?.windowId })
      return true
    case 'COPY_WIN':
      getCurrentTab().then((tab) => {
        if (tab && tab.id) {
          chrome.tabs.duplicate(tab.id)
          sendResponse({ result: 'success' })
        }
      })
      return true
    default:
      break
  }
})

/**
 * 监听xhr请求
 */
// chrome.webRequest.onCompleted.addListener(
//   function(details) {
//     console.log('details: ', details);
//     return {cancel: details.url.indexOf(":omni.axisbank.co.in/wsprod/mib") != -1};
//   },
//   {urls: ["<all_urls>"]}
// );

// chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(function (o) {
//   console.log('rule matched:', o);
// });

// chrome.declarativeNetRequest.updateDynamicRules(rules, () => {
//   if (chrome.runtime.lastError) {
//     console.error(chrome.runtime.lastError);
//   } else {
//     chrome.declarativeNetRequest.getDynamicRules(rules => console.log(rules));
//   }
// });

export {}
