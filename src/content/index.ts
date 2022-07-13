console.info('chrome-ext template-vue-ts content script')


import { createApp } from 'vue'
import './style.css'
import Content from './Content.vue'

import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

let mountEl = document.createElement("div");
mountEl.setAttribute("id", 'kkapp');
document.body.appendChild(mountEl);

const vm:any = createApp(Content).use(ElementPlus).mount(mountEl);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  vm.onMessage(request)
  sendResponse('我是content,我收到你的消息了：'+JSON.stringify("request"));
});

// inject injected script
var s = document.createElement('script');
s.src = chrome.runtime.getURL('js/injected.js');
s.onload = function () {
    // s.remove();
};
(document.body || document.head).appendChild(s);

// receive message from injected script
window.addEventListener('message', function (e) {
  console.log('content script received:' , e.data);
});

