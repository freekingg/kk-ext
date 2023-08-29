<template>
  <main id="kk-container">
    <div style="display: flex; align-items: center; width: 350px; font-size: 14px; flex-wrap: wrap">
      <el-alert title="操作说明" type="info">
        <p>此网站不支持接口下载</p>
        <p>在Account Statement流水界面点击开始即可自动下载</p>
      </el-alert>
    </div>
    <section class="run-status">
      <!-- <img :src="runGifSrc"> -->
      <el-result icon="info" :title="onOff ? '运行中' + cutDownNum + 's' : '未启动'">
        <template #icon>
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
        <el-form-item>
          <el-button type="primary" @click="submitForm(ruleFormRef)">保存</el-button>
        </el-form-item>
      </el-form>
    </section>
  </main>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, reactive, toRefs, watch } from 'vue'
import { ElMessage, ElIcon } from 'element-plus'
import { QuestionFilled, Search } from '@element-plus/icons-vue'
import useStorage from '../useStorage'
import { sleep, Timer, eventClick } from '../../utils/index'
let timer: any = null
let cutDownNumTimer: any = null
let checkDownTimer: any = null
let checkLiushuiPage: any = null
let checkoutBlockOverlayTimer: any = null
export default defineComponent({
  components: { QuestionFilled, ElIcon },
  props: {
    onOff: Boolean,
    data: String,
  },
  emits: ['onOffHandle'],
  setup(props: any, ctx) {
    const cutDownNum = ref(20)
    const settingVisible = ref(false)
    const runGifSrc = ref(chrome.runtime.getURL('img/runing.gif'))
    const state = reactive({
      currentTab: null,
    })

    const { setSyncStorage, getSyncStorage } = useStorage()

    const ruleFormRef = ref()
    const dialogHelpVisible = ref(false)

    const ruleForm = reactive({
      intervalTime: 20, //爬取间隔时间
      reportUrl: '', //上报接口地址
      name: 'Hello',
      data: {},
      accNumber: '', //accNumber
    })
    const rules = reactive({
      intervalTime: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
      desc: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
    })

    watch(
      () => props.onOff,
      (newValue) => {
        clearTimeout(timer)
        clearInterval(cutDownNumTimer)
        clearInterval(checkDownTimer)
        clearInterval(checkLiushuiPage)
        clearInterval(checkoutBlockOverlayTimer)
        setSyncStorage({ mode: 'download' })
        if (newValue) {
          setSyncStorage({ onOff: newValue })
          if (!watchBillPage()) {
            ElMessage({
              message: '[启动失败]：请在流水界面执行开始.',
              type: 'error',
            })
            ctx.emit('onOffHandle', false)
            setSyncStorage({ onOff: false })
          } else {
            download()
          }
        } else if (!newValue) {
          setSyncStorage({ onOff: false })
          ctx.emit('onOffHandle', false)
          ElMessage({
            message: '[任务已经关闭].',
            type: 'info',
          })
        } else {
          setSyncStorage({ onOff: false })
          ElMessage({
            message: '[启动失败]：请在流水界面执行开始.',
            type: 'error',
          })
          ctx.emit('onOffHandle', false)
        }
      },
    )

    // 检查流水页面
    const watchBillPage = () => {
      let HREF_Space: any = document.querySelector('a[title="Accounts"]')
      if (HREF_Space) {
        return true
      } else {
        return false
      }
    }

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

    const checkBlockOverlay = () => {
      let maxNum = 120
      let num = 0
      return new Promise((resolve) => {
        let timer = setInterval(() => {
          num++
          if (maxNum > maxNum) {
            clearInterval(timer)
            resolve(false)
          }
          let blockOverlay: any = document.querySelector('.blockUI')
          if (!blockOverlay) {
            clearInterval(timer)
            resolve(true)
          }
        }, 1000)
      })
    }

    const download = async () => {
      if (!props.onOff) return
      if (!watchBillPage()) {
        return
      }

      var myDate = new Date()
      function add(n: any) {
        if (n <= 9) {
          return `0${n}`
        }
        return n
      }
      var myYear = myDate.getFullYear() //获取完整的年份(4位,1970-????)
      var myMonth = add(myDate.getMonth() + 1) //获取当前月份(0-11,0代表1月)
      var myToday = add(myDate.getDate()) //获取当前日(1-31)
      let today = `${myToday}/${myMonth}/${myYear}`
      // let today = `20/06/2023`   24/02/2023
      // 展开过滤条件

      const resetHandle = () => {
        // 重置
        clearTimeout(timer)
        clearInterval(cutDownNumTimer)
        cutDownNum.value = ruleForm.intervalTime
        timer = setTimeout(() => {
          download()
        }, ruleForm.intervalTime * 1000 || 20000)
        cutDownNumTimer = setInterval(() => {
          cutDownNum.value--
          if (cutDownNum.value < 0) {
            clearInterval(cutDownNumTimer)
          }
        }, 1000)
      }

      const liushuiHandle = async () => {
        let pathname: any = location.pathname
        let type: any = 'Person'
        if (pathname.indexOf('CorpBank') > -1) {
          type = 'CorpBank'
        }
        console.log('type: ', type)

        if (type === 'Person') {
          // 选择日期
          let dateRadioDom: any = document.querySelector(
            'input[name="TransactionHistoryFG.SELECTED_RADIO_INDEX"]',
          )
          if (dateRadioDom) {
            let ischecked: any = dateRadioDom.checked
            if (!ischecked) {
              eventClick(dateRadioDom)
              await sleep(1000)
            }
          }

          let startDateDom: any = document.querySelector(
            'input[name="TransactionHistoryFG.FROM_TXN_DATE"]',
          )
          if (startDateDom) {
            startDateDom.value = today
          }
          await sleep(1000)
        } else {
          // let radioLast: any = document.querySelector(
          //   'input[name="TransactionHistoryFG.SELECTED_RADIO_INDEX"]',
          // )
          // eventClick(radioLast)
          // await sleep(1000)

          let lastInput: any = document.querySelector(
            'input[name="TransactionHistoryFG.LAST_N_TXN"]',
          )
          lastInput.click()
          lastInput.value = 40
          await sleep(1000)
        }

        // 搜索
        let searchDom: any = document.querySelector('input[name="Action.SEARCH"]')
        if (searchDom) {
          eventClick(searchDom)
          let r = await checkBlockOverlay()
          console.log('r: ', r)
          await sleep(2000)
          if (r) {
            // let xlsDom: any = document.querySelector('input[title="Download as XLS"]')

            if (type === 'Person') {
              // 个户 edit xls文件
              let xlsDom: any = document.querySelector('input[name="Action.DOWNLOAD_SORT_XLS"]')
              if (xlsDom) {
                eventClick(xlsDom)
                resetHandle()
              }
            } else {
              // 公户 最近40
              let xlsDom2: any = document.querySelector('input[name="Action.GENERATE_REPORT"]')
              console.log('xlsDom2: ', xlsDom2)
              if (xlsDom2) {
                eventClick(xlsDom2)
                resetHandle()
              }
            }
          } else {
            resetHandle()
          }
        }
      }

      let expandableMenu: any = document.querySelector('a[name="HREF_MoreDetails"]')
      if (expandableMenu) {
        let hasCollapsipleMenu = expandableMenu.classList.contains('collapsipleMenu')
        if (hasCollapsipleMenu) {
          liushuiHandle()
        } else {
          eventClick(expandableMenu)
          await sleep(1000)
          liushuiHandle()
        }
      }
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

    const startHandle = async () => {
      setSyncStorage({ mode: 'download' })
      ctx.emit('onOffHandle', false)
      await sleep(1000)
      ctx.emit('onOffHandle', true)
    }
    const transForPageHandle = async () => {
      let transfer: any = document.querySelector('#ID_RTXNUI')
      if (transfer) {
        setSyncStorage({ mode: 'transer' })
        transfer.click()
        await sleep(1000)
        let transfer2: any = document.querySelector('#Make-Payments_Make-Payments')
        ctx.emit('onOffHandle', false)
        transfer2.click()
      }
    }

    // 与后台通信
    onMounted(async () => {
      let _intervalTime: number = await getSyncStorage('intervalTime')
      let _reportUrl: any = await getSyncStorage('reportUrl')
      let mode: any = await getSyncStorage('mode')
      let onOff: any = (await getSyncStorage('onOff')) || false
      if (onOff) {
        ctx.emit('onOffHandle', onOff)
      }
      if (mode === 'transer') {
        let lis: any = document.querySelectorAll('.stage3_menuIdTextlink li')
        if (lis && lis.length) {
          setSyncStorage({ mode: 'download' })
          let indexs = Array.from(lis).findIndex(
            (item: any) => item.innerText === 'Outside Bank Transfer',
          ) //Today Last 1 Month
          lis[indexs].querySelector('a').click()
        }
      }
      ruleForm.intervalTime = _intervalTime || 20
      ruleForm.reportUrl = _reportUrl || ''
      cutDownNum.value = ruleForm.intervalTime
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
      startHandle,
      transForPageHandle,
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
