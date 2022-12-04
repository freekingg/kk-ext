export const sleep = (time: number = 1000, cb?: Function) => {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      cb && cb()
      resolve(timer)
    }, time)
  })
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
