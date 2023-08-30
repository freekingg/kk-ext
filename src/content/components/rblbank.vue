<template>
  <main id="kk-container">
    <div style="display: flex; align-items: center; width: 350px; font-size: 14px; flex-wrap: wrap">
      <el-alert title="操作说明" type="info">
        <p>此网站不支持接口下载</p>
        <p>在Account Statement流水界面点击开始即可自动下载</p>
      </el-alert>
    </div>
    <section class="run-status">
      <el-result icon="info" :title="onOff ? '运行中' + cutDownNum + 's' : '未启动'">
        <template #icon>
          <img :src="runGifSrc" v-if="onOff" />
        </template>
        <template #extra>
          <el-button type="primary" @click="settingVisibleHandle">配置</el-button>
        </template>
      </el-result>
    </section>
    <section v-if="settingVisible">
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
        <el-form-item label="下载模式">
          <el-radio-group v-model="ruleForm.downloadMode">
            <el-radio :label="1">全流水模式</el-radio>
            <el-radio :label="2">最近40笔</el-radio>
            <el-radio :label="3">金额区间</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item
          v-if="ruleForm.downloadMode === 3"
          label="金额范围"
          prop="reportUrl"
          v-for="(item, index) in limits"
          :key="index"
        >
          <el-input size="small" v-model="item.min" style="width: 100px" /> -
          <el-input
            size="small"
            v-model="item.max"
            style="width: 100px; margin-left: 4px; margin-right: 4px"
          />
          <el-switch
            size="small"
            v-model="item.onOff"
            active-color="#13ce66"
            inactive-color="#ff4949"
          >
          </el-switch>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="submitForm(ruleFormRef)">保存</el-button>
        </el-form-item>
      </el-form>
    </section>
  </main>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, reactive, toRefs, watch, toRaw } from 'vue'
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
      downloadMode: 1,
      accNumber: '', //accNumber
    })

    const limits: any = ref([
      { min: 100, max: 200, onOff: true },
      { min: 201, max: 600, onOff: false },
      { min: 601, max: 1000, onOff: false },
      { min: 1001, max: 1500, onOff: false },
      { min: 1501, max: 2500, onOff: false },
      { min: 2501, max: 4000, onOff: false },
      { min: 4001, max: 6000, onOff: false },
      { min: 6001, max: 8000, onOff: false },
      { min: 8001, max: 10000, onOff: false },
      { min: 10001, max: 25000, onOff: false },
      { min: 25001, max: 50000, onOff: false },
      { min: 50001, max: 100000, onOff: false },
    ])

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
          setSyncStorage({ step: 0 })
          setSyncStorage({ limits: toRaw(limits.value) })
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

        let downloadMode: any = ruleForm.downloadMode

        let FROM_AMOUNT: any = document.querySelector(
          'input[name="TransactionHistoryFG.FROM_AMOUNT"]',
        )
        let TO_AMOUNT: any = document.querySelector('input[name="TransactionHistoryFG.TO_AMOUNT"]')

        if (type === 'Person') {
          if (downloadMode === 2) {
            let lastInput: any = document.querySelector(
              'input[name="TransactionHistoryFG.LAST_N_TXN"]',
            )
            lastInput.click()
            lastInput.value = 40

            if (FROM_AMOUNT) {
              FROM_AMOUNT.value = ''
              TO_AMOUNT.value = ''
            }

            await sleep(1000)
          } else if (downloadMode === 3) {
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
            let endDateDom: any = document.querySelector(
              'input[name="TransactionHistoryFG.TO_TXN_DATE"]',
            )
            if (startDateDom) {
              startDateDom.value = today
            }
            if (endDateDom) {
              endDateDom.value = today
            }
            await sleep(1000)

            let _step: number = (await getSyncStorage('step')) || 0
            let keyong = limits.value.filter((item: any) => item.min && item.max && item.onOff)
            let targetAmount = keyong[_step]
            console.log('targetAmount: ', targetAmount)
            if (targetAmount) {
              if (FROM_AMOUNT) {
                FROM_AMOUNT.value = targetAmount['min']
                TO_AMOUNT.value = targetAmount['max']
              }
              setSyncStorage({ step: _step + 1 })
            } else {
              setSyncStorage({ step: 0 })
              resetHandle()
              return
            }
          } else {
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
            let endDateDom: any = document.querySelector(
              'input[name="TransactionHistoryFG.TO_TXN_DATE"]',
            )
            if (startDateDom) {
              startDateDom.value = today
            }
            if (endDateDom) {
              endDateDom.value = today
            }

            if (FROM_AMOUNT) {
              FROM_AMOUNT.value = ''
              TO_AMOUNT.value = ''
            }
            await sleep(1000)
          }
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
                if (downloadMode === 3) {
                  await sleep(5000)
                  download()
                  return
                }
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

    // 与后台通信
    onMounted(async () => {
      let _intervalTime: number = await getSyncStorage('intervalTime')
      let downloadMode: any = await getSyncStorage('downloadMode')
      let _limits: number = await getSyncStorage('limits')
      limits.value = _limits || [
        { min: 100, max: 200, onOff: true },
        { min: 201, max: 600, onOff: false },
        { min: 601, max: 1000, onOff: false },
        { min: 1001, max: 1500, onOff: false },
        { min: 1501, max: 2500, onOff: false },
        { min: 2501, max: 4000, onOff: false },
        { min: 4001, max: 6000, onOff: false },
        { min: 6001, max: 8000, onOff: false },
        { min: 8001, max: 10000, onOff: false },
        { min: 10001, max: 25000, onOff: false },
        { min: 25001, max: 50000, onOff: false },
        { min: 50001, max: 100000, onOff: false },
      ]

      ruleForm.downloadMode = downloadMode || 1
      ruleForm.intervalTime = _intervalTime || 20
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
      dialogHelpVisible,
      limits,
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
#kk-container {
  max-height: 72vh;
  overflow: auto;
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

#kk-container :deep() input[type='text'] {
  border-bottom: 1px solid #e9e9e9;
  color: #010101;
  height: 1.5rem !important;
  margin-top: 4px;
  width: 100%;
}
</style>
