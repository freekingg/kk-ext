export const sleep = (time: number = 1000, cb?: Function) => {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      cb && cb()
      resolve(timer)
    }, time)
  })
}

// 创建一个模拟鼠标移动的事件
export const simulateMouseMove = (element:any, posX:any, posY:any) => {
  var event = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: posX,
      clientY: posY
  });
  element.dispatchEvent(event);
}

export const Timer: any = {
  sleep: function (time: number = 1000, cb?: Function) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        cb && cb()
        resolve(timer)
        clearTimeout(timer)
      }, time)
    })
  },
  setTimeout: {
    start: function (_timerName: string, _func: Function, _interval: number) {
      if (Timer.setTimeout[_timerName]) {
        Timer.setTimeout.stop(_timerName)
      }
      Timer.setTimeout[_timerName] = setTimeout(_func, _interval || 1000)
    },
    stop: function (_timerName: string) {
      clearTimeout(Timer.setTimeout[_timerName])
      Timer.setTimeout[_timerName] = null
    },
  },
  setInterval: {
    start: function (_timerName: string, _func: Function, _interval: number) {
      if (Timer.setInterval[_timerName]) {
        Timer.setInterval.stop(_timerName)
      }
      Timer.setInterval[_timerName] = setInterval(_func, _interval || 1000)
    },
    stop: function (_timerName: string) {
      clearInterval(Timer.setInterval[_timerName])
      Timer.setInterval[_timerName] = null
    },
  },
}

export const eventClick = (element:any) => {
  const eventOpts = { bubbles: true, view: window };

  element.dispatchEvent(new MouseEvent('mousedown', eventOpts));
  element.dispatchEvent(new MouseEvent('mouseup', eventOpts));

  if (element.click) {
    element.click();
  } else {
    element.dispatchEvent(new PointerEvent('click', { bubbles: true }));
  }
}

