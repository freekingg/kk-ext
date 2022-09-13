console.info('chrome-ext template-vue-ts background script')


const menus:any = {
    contexts: ["all"],
    id: 'copy',
    title: '复制当前窗口',
}
chrome.contextMenus.create(menus);//添加menu菜单

chrome.contextMenus.onClicked.addListener((menu)=>{
  getCurrentTab().then((tab)=>{
    if(tab && tab.id){
      chrome.tabs.duplicate(tab.id);
    }
    });
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
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

/**
* 监听tab页面变化
*/
chrome.tabs.onUpdated.addListener(function(tabId:number,changeInfo:chrome.tabs.TabChangeInfo,tab:chrome.tabs.Tab){
  // console.log('changeInfo: ', changeInfo);
  // console.log('tab: ', tab);
  // if( changeInfo.url == undefined){return false;}

  if (changeInfo.status && tab.status === 'complete') {
    console.log('当前url',tab.url)
    // getCurrentTab().then(()=>{
    //   chrome.tabs.sendMessage(tabId, { tab },(response)=>{
    //     // 回复 response
    //   })
    // });
  }
});

/**
* 监听消息通信
*/
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('后台监听消息: ', request);
  switch (request.type) {
    case "POPUP_INIT":
      getCurrentTab().then(()=>{
        sendResponse({result:'success'})
      });
      return true;
    default:
      break;
  }
});

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
