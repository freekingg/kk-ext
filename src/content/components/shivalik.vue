<template>
  <main id="kk-container">
    <div style="display: flex; align-items: center; width: 350px; font-size: 14px; flex-wrap: wrap">
      <el-alert
        title="操作说明"
        type="info">
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
    <div class="btn-area" style="display: flex;justify-content: center;margin-bottom: 10px;">
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
import { QuestionFilled } from '@element-plus/icons-vue'
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
      let HREF_Space: any = document.querySelector('.headertext_name')
      if (HREF_Space) {
        return true
      } else {
        return false
      }

      // let inputs = document.querySelectorAll('form[name="TransactionHistoryFG"] input')
      // let ra1 = document.querySelector('#dwnldDetailsCaption')
      // if (inputs.length && ra1) {
      //   return true
      // } else {
      //   return false
      // }
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
      clearInterval(checkLiushuiPage)
      clearInterval(checkoutBlockOverlayTimer)

      await checkBlockOverlay()

      const liushuiHandle = async () => {
        //打开时间搜索框
        let filterIcon: any = document.querySelector('input[name="TransactionHistoryFG.FROM_TXN_DATE_submit"]+.picker-icon')
        await sleep(1000)
        filterIcon.click()
        await sleep(1000)

        // 选择日期
        let dayBtn: any = document.querySelector('.picker__today')
        dayBtn.click()
        await sleep(500)

        let enterBtn: any = document.querySelector('.picker__close')
        enterBtn.click()
        await sleep(500)


        //打开条件搜索框 结束
        let filterIcon2: any = document.querySelector('input[name="TransactionHistoryFG.TO_TXN_DATE_submit"]+.picker-icon')
        await sleep(1000)
        filterIcon2.click()
        await sleep(1000)

        // 选择日期
        let dayBtn2: any = document.getElementById('PageConfigurationMaster_WA101__1:TransactionHistoryFG.TO_TXN_DATE_root')
        let dayBtns2:any = dayBtn2.querySelector('.picker__today')
        dayBtns2.click()
        await sleep(500)

        let enterBtn2: any = dayBtn2.querySelector('.picker__close')
        enterBtn2.click()
        await sleep(500)
        

        // 点击查询按钮
        let b: any = document.querySelector('input[name="Action.SEARCH"]')
        b.click()
        await sleep(3000)
        
        // 检查结果
        checkoutBlockOverlayTimer = setInterval(() => {
          let blockOverlay: any = document.querySelector('.blockUI')
          if (!blockOverlay) {
            clearInterval(checkoutBlockOverlayTimer)

            // 点击下载按钮
            let downBtn:any = document.querySelector('input[name="autocomplete-dropdown"]')
            let xlsBtn: any = document.querySelector('input[name="Action.GENERATE_REPORT"]')
            let downloadForm = document.getElementById('PageConfigurationMaster_WA101__1:dwnldDetailsCaption')
            if(downloadForm){
              // let dwonIcon:any = downloadForm.querySelector('.icon-dropdown.autocomplete-icon')
              // dwonIcon.click()
              let downloadSel:any = document.querySelector('select[name="TransactionHistoryFG.OUTFORMAT"]')
              downloadSel.value = "4"  //4 xls  7 txt
              if(xlsBtn){
                xlsBtn.click()
              }
            }
            

            // 重置
            clearTimeout(timer)
            clearInterval(cutDownNumTimer)
            cutDownNum.value = ruleForm.intervalTime
            timer = setTimeout(() => {
              // let parent_DASHAT:any = document.querySelector('#parent_DASHAT a')
              // parent_DASHAT.click()
              download()
            }, ruleForm.intervalTime * 1000 || 20000)
            cutDownNumTimer = setInterval(() => {
              cutDownNum.value--
              if (cutDownNum.value < 0) {
                clearInterval(cutDownNumTimer)
              }
            }, 1000)
          }
        }, 1000)
      }
      await sleep(1000)

      // let parent_DASHAT:any = document.querySelector('#parent_DASHAT a')
      // parent_DASHAT.click()

      // 是否在流水界面
      let AccountStatement: any = document.querySelector('input[name="Action.SEARCH"]')
      let ac:any = document.querySelector('a[title="A/C Statement"]')
      // 账号详情页面
      let accountDetail:any = document.getElementById('HREF_PageConfigurationMaster_WA101__1:AccountSummaryFG.OPR_CURRENT_ACCOUNT_NUMBER_ARRAY[0]')
      await sleep(1000)
      if (AccountStatement) {
        // 流水界面
        liushuiHandle()
      }else if(ac){
        ac.click()
      }else if(accountDetail){
        accountDetail.click()
        await checkBlockOverlay()
        liushuiHandle()
      } else {
        let parent_DASHAT:any = document.querySelector('#parent_RACTS #ID_RACTS')
        if(parent_DASHAT){
          parent_DASHAT.click()
          setTimeout(()=>{
            let acountBtn:any = document.querySelector('#My-Accounts_My-Accounts')
            acountBtn.click()
          },1000)
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

    const startHandle = async () =>{
      setSyncStorage({ mode: 'download' })
      ctx.emit('onOffHandle', false)
      await sleep(1000)
      ctx.emit('onOffHandle', true)
    }
    const transForPageHandle = async () =>{
      let transfer:any = document.querySelector('#ID_RTXNUI')
      if(transfer){
        setSyncStorage({ mode: 'transer' })
        transfer.click()
        await sleep(1000)
        let transfer2:any = document.querySelector('#Make-Payments_Make-Payments')
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
        let lis:any = document.querySelectorAll('.stage3_menuIdTextlink li')
        if(lis && lis.length){
          setSyncStorage({ mode: 'download' })
          let indexs = Array.from(lis).findIndex((item: any) => item.innerText === 'Outside Bank Transfer') //Today Last 1 Month
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
