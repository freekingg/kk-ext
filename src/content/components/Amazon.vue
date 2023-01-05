<template>
  <div id="kk-container">
    <section class="run-status">
      <!-- <img :src="runGifSrc"> -->
      <el-result icon="info" :title="onOff ? '运行中' + cutDownNum + 's' : '未启动'">
        <template #icon>
          <p>{{ currentStatus }}</p>
          <p style="color: darkgoldenrod">{{ current2Status }}</p>
          <img :src="runGifSrc" v-if="onOff" />
        </template>
        <!-- <template #sub-title>
          <img :src="runGifSrc" v-if="onOff">
        </template> -->
        <template #extra>
          <el-button type="primary" @click="settingVisibleHandle">配置</el-button>
        </template>
      </el-result>
    </section>
    <section v-if="settingVisible">
      <!-- <el-alert title="配置" type="info" center show-icon /> -->
      <el-form
        ref="ruleFormRef"
        :model="ruleForm"
        :rules="rules"
        label-width="120px"
        class="demo-ruleForm"
        status-icon
      >
        <el-form-item label="爬取间隔(s)" prop="intervalTime">
          <el-input type="number" v-model="ruleForm.intervalTime" />
        </el-form-item>
        <el-form-item label="下载页数" prop="intervalTime">
          <el-input type="number" :disabled="ruleForm.downloadAll === 2" v-model="ruleForm.maxNum" />
        </el-form-item>
        <!-- <el-form-item label="上报接口" prop="reportUrl">
          <el-input v-model="ruleForm.reportUrl" />
        </el-form-item> -->
        <el-form-item label="请求间隔(s)" prop="spaceTime">
          <el-input type="number" v-model="ruleForm.spaceTime" />
        </el-form-item>
        <el-form-item label="下载模式">
          <el-radio-group v-model="ruleForm.downloadAll">
            <el-radio :label="1">单页模式</el-radio>
            <el-radio :label="2">全流水模式</el-radio>
          </el-radio-group>
        </el-form-item>
        <!-- <el-form-item label="请求参数">
          <el-input v-model="data" type="textarea" disabled />
        </el-form-item> -->
        <!-- <el-form-item>
          <el-button type="primary" @click="submitForm(ruleFormRef)">保存</el-button>
        </el-form-item> -->
      </el-form>
    </section>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, reactive, toRefs, watch } from 'vue'
import { ElMessage, ElIcon } from 'element-plus'
import { QuestionFilled } from '@element-plus/icons-vue'
import useStorage from '../useStorage'
import { sleep, Timer, eventClick } from '../../utils/index'
import { writeFileXLSX, utils } from 'xlsx'

export default defineComponent({
  components: { QuestionFilled, ElIcon },
  props: {
    onOff: Boolean,
    data: String,
  },
  emits: ['onOffHandle'],
  setup(props: any, ctx) {
    const cutDownNum = ref(10)
    const cutDownNumTotal = ref(10)
    const settingVisible = ref(false)
    const currentStatus = ref(<any>'')
    const current2Status = ref(<any>'')

    const runGifSrc = ref(chrome.runtime.getURL('img/runing.gif'))
    const state = reactive({
      currentTab: 1,
      files: {},
      pageNum: 1,
      pageNumTotal: 1,
      params: {},
      paramsTotal: {},
      recordList: <any>[],
      recordListTotal: <any>[],
      downloadTimer: <any>null,
      downloadTimerTotal: <any>null,
      cutDownNumTimer: <any>null,
      cutDownNumTimerTotal: <any>null,
    })

    const { setSyncStorage, getSyncStorage } = useStorage()

    const ruleFormRef = ref()
    const dialogHelpVisible = ref(false)

    const ruleForm = reactive({
      intervalTime: 5, //爬取间隔时间
      spaceTime: 2,
      reportUrl: '', //上报接口地址
      name: 'Hello',
      data: {},
      maxNum: 5,
      downloadAll: 1,
    })
    const rules = reactive({
      intervalTime: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
      spaceTime: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
      desc: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
    })

    watch(
      () => props.onOff,
      async (newValue) => {
        let tipEl = document.querySelector('#tipDom')
        if (tipEl) {
          document.body.removeChild(tipEl)
        }

        if (newValue) {
          if (ruleForm.downloadAll === 1) {
            clearTimeout(state.downloadTimer)
            clearInterval(state.cutDownNumTimer)
            state.pageNum = 1
            state.recordList = []
          } else if (ruleForm.downloadAll === 2) {
            clearTimeout(state.downloadTimerTotal)
            clearInterval(state.cutDownNumTimerTotal)
            state.recordListTotal = []
            state.pageNumTotal = 1
          }

          if (window.location.pathname == '/pay/history') {
            if (ruleForm.downloadAll === 1) {
              download()
            } else if (ruleForm.downloadAll === 2) {
              downloadTotal()
            }
            ctx.emit('onOffHandle', true)
            return
          }
          ElMessage({
            message: '请打开流水界面再开始',
            type: 'error',
          })
          ctx.emit('onOffHandle', false)
        } else {
          setSyncStorage({ onOff: false })
          ElMessage({
            message: '[任务已经关闭].',
            type: 'info',
          })
        }
      },
    )

    const submitForm = async (formEl: any) => {
      if (!formEl) return
      await formEl.validate((valid: any, fields: any) => {
        if (valid) {
          console.log('submit!')
          setSyncStorage(ruleForm)
        } else {
          console.log('error submit!', fields)
        }
      })
    }

    const resetForm = (formEl: any) => {
      if (!formEl) return
      formEl.resetFields()
    }

    const settingVisibleHandle = () => {
      settingVisible.value = !settingVisible.value
    }

    const helpHandle = () => {
      dialogHelpVisible.value = true
    }

    const downloadFile = async (list: any = [], flag: Boolean = true) => {
      let newList = list
      const ws = utils.json_to_sheet(newList)
      const wb = utils.book_new()
      utils.book_append_sheet(wb, ws, 'Data')
      writeFileXLSX(wb, 'AmazonSheet.xlsx')
    }

    const download = async () => {
      if (!props.onOff) {
        clearTimeout(state.downloadTimer)
        clearInterval(state.cutDownNumTimer)

        return
      }

      state.pageNum = 1
      state.recordList = []
      currentStatus.value = ''
      current2Status.value = ''

      let tipEl = document.querySelector('#tipDom')
      let tipDom: any = null
      if (!tipEl) {
        tipDom = document.createElement('div')
        tipDom.id = 'tipDom'
        tipDom.style.position = 'fixed'
        tipDom.style.zIndex = 9999
        tipDom.style.left = '20px'
        tipDom.style.top = '60px'
        tipDom.style.backgroundColor = 'red'
        tipDom.style.padding = '30px'
        tipDom.innerHTML = `
        <h1>下载中...</h1>
        <div>不要操作页面...</div>
        <div style="color:#fff">页面不要最小化...</div>
        `
        document.body.appendChild(tipDom)
      }

      window.scrollTo(0, 0)
      await sleep(500)
      let allTabBtn: any = document.querySelector('#all-tab-desktop span')
      allTabBtn.click()
      await sleep(1200)

      let upiBtn: any = document.querySelector('input[value="UPI"]')
      if (!upiBtn.checked) {
        upiBtn.click()
      }
      await sleep(1000)
      let successBtn: any = document.querySelector('input[value="SUCCESS"]')
      let pendingBtn: any = document.querySelector('input[value="PENDING"]')
      if (successBtn) {
        pendingBtn.click()
        await sleep(1000)
        successBtn.click()
      }

      await sleep(1000)
      // 滚动页面
      let lastHeight = 0
      let step = window.innerHeight
      const scrollBottom = async () => {
        if (!props.onOff) {
          clearTimeout(state.downloadTimer)
          clearInterval(state.cutDownNumTimer)
          return
        }
        await sleep(1000)
        return new Promise(async (resolve) => {
          let clientHeight = ruleForm.maxNum * step
          if (lastHeight < clientHeight) {
            state.pageNum++
            currentStatus.value = `实时下载进度：第 ${state.pageNum} 页,共 ${ruleForm.maxNum} 页`
            await sleep(ruleForm.spaceTime * 1000)
            window.scrollBy(0, step)
            scrollBottom()
            lastHeight += step
          } else {
            let items = document.querySelectorAll('#transactions-desktop span.a-declarative')
            let data: any = []
            if (items.length) {
              let a = Array.from(items)
              let getText = (dom: any, sel: any) => {
                let d = dom.querySelector(sel)
                if (d) {
                  return d.innerText
                } else {
                  return '-'
                }
              }
              data = a.map((item) => {
                let rows = item.querySelectorAll('.a-expander-content .a-row.pad-mini-details-text')
                let rowsDom = Array.from(rows)
                let rowData = rowsDom.map((item) => {
                  let cloumns: any = item.querySelectorAll('.a-column')
                  return `${cloumns[0] ? cloumns[0].innerText.replace(/\s|\n/g, '') : ''} ${
                    cloumns[1] ? cloumns[1].innerText.replace(/\s|\n/g, '') : ''
                  }`
                })
                return {
                  title: getText(item, '.a-text-left .pad-header-text'),
                  payment: getText(item, '.a-text-left .payment-details-desktop'),
                  date: getText(item, '.a-text-left>.a-color-tertiary'),
                  amount: getText(item, '.a-text-right>span'),
                  detail: rowData.join('  '),
                }
              })
            }
            console.log('本轮下载完成', data.length)
            state.recordList = data
            downloadFile(state.recordList)
            // 重置
            clearTimeout(state.downloadTimer)
            clearInterval(state.cutDownNumTimer)
            cutDownNum.value = ruleForm.intervalTime
            state.downloadTimer = setTimeout(() => {
              download()
            }, ruleForm.intervalTime * 1000 || 20000)
            state.cutDownNumTimer = setInterval(() => {
              cutDownNum.value--
              if (cutDownNum.value < 0) {
                clearInterval(state.cutDownNumTimer)
              }
            }, 1000)
            resolve(true)
          }
        })
      }
      scrollBottom()
    }

    const downloadTotal = async () => {
      if (!props.onOff) {
        clearTimeout(state.downloadTimerTotal)
        clearTimeout(state.cutDownNumTimerTotal)
        return
      }
      state.pageNumTotal = 1
      state.recordListTotal = []
      currentStatus.value = ''
      current2Status.value = ''

      let tipEl = document.querySelector('#tipDom')
      let tipDom: any = null
      if (!tipEl) {
        tipDom = document.createElement('div')
        tipDom.id = 'tipDom'
        tipDom.style.position = 'fixed'
        tipDom.style.zIndex = 9999
        tipDom.style.left = '20px'
        tipDom.style.top = '60px'
        tipDom.style.backgroundColor = 'red'
        tipDom.style.padding = '30px'
        tipDom.innerHTML = `
        <h1>全流水下载中...</h1>
        <div>不要操作页面...</div>
        <div style="color:#fff">页面不要最小化...</div>
        `
        document.body.appendChild(tipDom)
      }

      window.scrollTo(0, 0)
      await sleep(500)
      let allTabBtn: any = document.querySelector('#all-tab-desktop span')
      allTabBtn.click()
      await sleep(1200)

      let upiBtn: any = document.querySelector('input[value="UPI"]')
      if (!upiBtn.checked) {
        upiBtn.click()
      }
      await sleep(1000)
      let successBtn: any = document.querySelector('input[value="SUCCESS"]')
      let pendingBtn: any = document.querySelector('input[value="PENDING"]')
      if (successBtn) {
        pendingBtn.click()
        await sleep(1000)
        successBtn.click()
      }
      await sleep(1000)
      // 滚动页面
      let step = window.innerHeight
      const scrollBottom = async () => {
        if (!props.onOff) {
          clearTimeout(state.downloadTimerTotal)
          clearInterval(state.cutDownNumTimerTotal)
          return
        }
        await sleep(1000)
        let listHeight:any = document.querySelector('#transactions-section-desktop')
        return new Promise(async (resolve) => {
          let clientHeight = listHeight.offsetHeight
          if (document.documentElement.scrollTop < clientHeight) {
            state.pageNumTotal++
            current2Status.value = `总流水下载进度：第 ${state.pageNumTotal} 页`
            await sleep(ruleForm.spaceTime * 1000)
            window.scrollBy(0, step)
            scrollBottom()
          } else {
            console.log('scrollBottom ok')
            let items = document.querySelectorAll('#transactions-desktop span.a-declarative')
            let data: any = []
            if (items.length) {
              let a = Array.from(items)
              let getText = (dom: any, sel: any) => {
                let d = dom.querySelector(sel)
                if (d) {
                  return d.innerText
                } else {
                  return '-'
                }
              }
              data = a.map((item) => {
                let rows = item.querySelectorAll('.a-expander-content .a-row.pad-mini-details-text')
                let rowsDom = Array.from(rows)
                let rowData = rowsDom.map((item) => {
                  let cloumns: any = item.querySelectorAll('.a-column')
                  return `${cloumns[0] ? cloumns[0].innerText.replace(/\s|\n/g, '') : ''} ${
                    cloumns[1] ? cloumns[1].innerText.replace(/\s|\n/g, '') : ''
                  }`
                })
                return {
                  title: getText(item, '.a-text-left .pad-header-text'),
                  payment: getText(item, '.a-text-left .payment-details-desktop'),
                  date: getText(item, '.a-text-left>.a-color-tertiary'),
                  amount: getText(item, '.a-text-right>span'),
                  detail: rowData.join('  '),
                }
              })
            }
            console.log('本轮下载完成', data.length)
            state.recordListTotal = data
            downloadFile(state.recordListTotal)
            // 重置
            clearTimeout(state.downloadTimerTotal)
            clearInterval(state.cutDownNumTimerTotal)
            cutDownNum.value = ruleForm.intervalTime
            state.downloadTimerTotal = setTimeout(() => {
              downloadTotal()
            }, ruleForm.intervalTime * 1000 || 20000)
            state.cutDownNumTimerTotal = setInterval(() => {
              cutDownNumTotal.value--
              if (cutDownNumTotal.value < 0) {
                clearInterval(state.cutDownNumTimerTotal)
              }
            }, 1000)
            resolve(true)
          }
        })
      }
      scrollBottom()
    }

    // 与后台通信
    onMounted(async () => {
      // let _intervalTime: number = await getSyncStorage('intervalTime')
      // let _spaceTime: number = await getSyncStorage('spaceTime')
      // let maxNum: number = await getSyncStorage('maxNum')
      // let _reportUrl: any = await getSyncStorage('reportUrl')

      // ruleForm.intervalTime = _intervalTime || 5
      // ruleForm.spaceTime = _spaceTime || 2
      // ruleForm.reportUrl = _reportUrl || ''
      // ruleForm.maxNum = maxNum || 5
    })
    return {
      settingVisible,
      settingVisibleHandle,
      runGifSrc,
      ruleFormRef,
      ruleForm,
      rules,
      helpHandle,
      cutDownNum,
      submitForm,
      resetForm,
      currentStatus,
      current2Status,
      dialogHelpVisible,
      ...toRefs(state),
    }
  },
})
</script>

<style scoped>
.run-status {
  display: flex;
  justify-content: center;
}
#kk-container :deep() .el-result {
  padding-top: 0;
}
#kk-container :deep() .el-result__title {
  margin-top: 10px;
}
#kk-container :deep() .el-result__extra {
  margin-top: 10px;
}
</style>
