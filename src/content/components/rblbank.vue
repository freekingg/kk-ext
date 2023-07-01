<template>
  <main id="kk-container">
    <div style="display: flex; align-items: center; width: 350px; font-size: 14px; flex-wrap: wrap">
      <el-alert title="操作说明" type="info">
        <p>此网站不支持接口下载</p>
        <p>直接点下载按钮或者打开开关即可自动下载xls流水文件</p>
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
    <div class="btn-area" style="display: flex; justify-content: center; margin-bottom: 10px">
      <el-button type="primary" @click="startHandle">下载流水</el-button>
      <!-- <el-button type="primary" @click="transForPageHandle">转账</el-button> -->
    </div>
    <el-dialog v-model="dialogHelpVisible" title="Tips" width="30%">
      <div>
        <strong>使用方法</strong>
        <ul style="padding: 0 20px">
          <li>1、进入流水界面，然后点击开始</li>
          <li>2、不想下载流水时将开关关闭</li>
          <li>3、下载间隔时间从设置里面配置</li>
        </ul>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button type="primary" @click="dialogHelpVisible = false">Confirm</el-button>
        </span>
      </template>
    </el-dialog>
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
      let HREF_Space: any = document.querySelector('#name_header')
      let MoreDetails: any = document.getElementById(
        'PageConfigurationMaster_CXACBSW__1:MoreDetails',
      )

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
      return new Promise((resolve) => {
        let timer = setInterval(() => {
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
      const liushuiHandle = async () => {
        // 选择时间类型
        let txnDateRadioButton: any = document.getElementById(
          'PageConfigurationMaster_CXACBSW__1:txnDateRadioButton',
        )
        if (txnDateRadioButton) {
          txnDateRadioButton.click()
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
        // let today = `20/06/2023`

        // 时间赋值
        let FROM_TXN_DATE: any = document.getElementById(
          'PageConfigurationMaster_CXACBSW__1:TransactionHistoryFG.FROM_TXN_DATE',
        )
        let TO_TXN_DATE: any = document.getElementById(
          'PageConfigurationMaster_CXACBSW__1:TransactionHistoryFG.TO_TXN_DATE',
        )
        if (FROM_TXN_DATE) {
          FROM_TXN_DATE.value = today
          TO_TXN_DATE.value = today
        }

        let SEARCH: any = document.getElementById('PageConfigurationMaster_CXACBSW__1:SEARCH')
        SEARCH.click()
        await checkBlockOverlay()

        let downloadtext: any = document.querySelector('.downloadtext')
        if (downloadtext) {
          let GENERATE_REPORT4: any = document.getElementById(
            'PageConfigurationMaster_CXACBSW__1:GENERATE_REPORT4',
          )
          GENERATE_REPORT4.click()
          await sleep(3000)
        }

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

      await checkBlockOverlay()
      await sleep(3000)

      // 是否在流水界面
      let AccountStatement: any = document.querySelector('input[name="Action.SEARCH"]')
      let ac: any = document.getElementById('PageConfigurationMaster_CXACBSW__1:NavigationPanel_Stage313.Ra1.C1')
      // 账号详情页面
      let accountDetail: any = document.querySelector('a[title="Account Number"]')
      
      if (AccountStatement) {
        console.log('AccountStatement: ', AccountStatement)
        // 流水界面
        liushuiHandle()
      } else if (ac && accountDetail) {
        accountDetail.click()
        await checkBlockOverlay()
        liushuiHandle()
      } else {
        let parent_DASHAT: any = document.querySelector('#parent_CACTS #IL_CACTS_20 a')
        console.log('parent_DASHAT: ', parent_DASHAT)
        if (parent_DASHAT) {
          parent_DASHAT.click()
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
