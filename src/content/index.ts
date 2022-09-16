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

// receive message from injected script
window.addEventListener('message', function (e) {
  console.log('content script received:' , e);
  if(e.data){
    vm.onMessage(e.data)
  }
});


// 窗口拖动效果
const extWinMoveHandle = ()=>{
  function handleMouseDown(e:any) {
    let box:any = document.getElementById('kkapp');
    // e.pageX, e.pageY 是鼠标在页面上的坐标
    // box.offsetLeft, box.offsetTop 是元素相对于页面左上角的偏移位置
    // disx, disy 便是鼠标相对于元素左上角的偏移位置
    let disx = e.pageX - box.offsetLeft;
    let disy = e.pageY - box.offsetTop;

    document.onmousemove = function (e) {       // 鼠标移动的时候计算元素的位置
      let x, y;
      if ((e.pageX - disx) > 0) {  // 元素相对于页面左上角的偏移位置 大于0时
        if ((e.pageX - disx) > document.documentElement.clientWidth - 60) {   // 元素相对于页面左上角的偏移位置 移出到页面以外（右侧）
          x = document.documentElement.clientWidth - 60;   // 60是元素自身的宽高
        } else {
          x = e.pageX - disx;
        }
      } else {    // 元素移到到页面以外（左侧）
        x = 0;
      }

      if ((e.pageY - disy) > 0) {
        if ((e.pageY - disy) > document.documentElement.clientHeight - 60) {   // 元素移动到页面以外（底部）
          y = document.documentElement.clientHeight - 60;
        } else {
          y = e.pageY - disy;
        }
      } else {        // 元素移动到页面以外（顶部）
        y = 0;
      }


      box.style.left = x + 'px';
      box.style.top = y + 'px';
      box.style.right = 'auto';
    }
  }
  // 释放鼠标按钮，将事件清空，否则始终会跟着鼠标移动
  function handleMouseUp() {
    document.onmousemove = document.onmouseup = null;
  }
  let box:any = document.querySelector('#kkapp .el-card__header');
  box.addEventListener('mousedown',handleMouseDown)
  box.addEventListener('mouseup',handleMouseUp)
}

extWinMoveHandle()
