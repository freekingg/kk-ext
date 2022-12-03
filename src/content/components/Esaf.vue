<template>
  <main id="kk-container">
    <div style="display: flex; align-items: center; width: 350px">
      <el-icon :size="24" color="#e6a23c" @click="helpHandle"><QuestionFilled /></el-icon>
      <p style="font-size: 14px; display: inline-block; margin: 0">
        此网站支持不后台下载流水，需要停留在流水界面,直接点开始即可
      </p>
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
        <el-form-item label="上报接口" prop="reportUrl">
          <el-input v-model="ruleForm.reportUrl" />
        </el-form-item>
        <el-form-item label="请求参数">
          <el-input v-model="data" type="textarea" disabled />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="submitForm(ruleFormRef)">保存</el-button>
        </el-form-item>
      </el-form>
    </section>

    <el-dialog v-model="dialogHelpVisible" title="Tips" width="30%">
      <div>
        <strong>使用方法</strong>
        <ul style="padding: 0 20px">
          <li>1、在流水界面，直接打开插件开关即可</li>
          <li>2、下载间隔时间从设置里面配置</li>
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
let timer: any = null
let cutDownNumTimer: any = null
let checkDownCsvBtn:any = null
export default defineComponent({
  components: { QuestionFilled, ElIcon },
  props: {
    onOff: Boolean,
    data: String,
  },
  emits: ['onOffHandle'],
  setup(props: any, ctx) {
    const cutDownNum = ref(30)
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
      async (newValue) => {
        clearTimeout(timer)
        clearInterval(cutDownNumTimer)
        clearInterval(checkDownCsvBtn)
        if (newValue) {
          setSyncStorage({ onOff: newValue })
          let submitBtn = document.querySelector('form[name="stmtForm"] button[type="submit"]')
          console.log('submitBtn: ', submitBtn)
          // 如果有查询按钮，则直接点击查询
          if (submitBtn) {
            ElMessage({
              message: '[任务执行成功].',
              type: 'success',
            })
            download()
            return
          }

          // 如果有csv下载按钮，直接进行下载

          let navList: any = document.querySelectorAll('li[ng-class="navClass(link)"]')
          if (navList.length) {
            navList[2].querySelector('a').click()
            let list = navList[2].querySelectorAll('li')
            list[4].querySelector('a').click()
            let s = setInterval(() => {
              let submitBtn = document.querySelector('form[name="stmtForm"] button[type="submit"]')
              if (submitBtn) {
                clearInterval(s)
                download()
              }
            }, 1000)
            return
          }

          ElMessage({
            message: '[请确认已经登录].',
            type: 'info',
          })
          setSyncStorage({ onOff: false })
          ctx.emit('onOffHandle', false)
        } else if (!newValue) {
          setSyncStorage({ onOff: false })
          ElMessage({
            message: '[任务已经关闭].',
            type: 'info',
          })
        } else {
          setSyncStorage({ onOff: false })
          ElMessage({
            message: '[启动失败]：请下载一次流水操作csv.',
            type: 'error',
          })
          ctx.emit('onOffHandle', false)
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

    const sleep = (seconds: number) => new Promise((resolve) => setTimeout(resolve, seconds))

    const download = async () => {
      if (!props.onOff) return
      await sleep(1500)
      let dataForm: any = {}
      let submitBtn: any = document.querySelector('form[name="stmtForm"] button[type="submit"]')
      if (submitBtn) {
        await sleep(1500)
        // 帐号类型
        let printTypedrpdown1: any = document.querySelector('select[name="accountType"]')
        printTypedrpdown1.value = 'DDA'
        printTypedrpdown1.dispatchEvent(new Event('change'))
        await sleep(2000)
        // 帐号
        let printTypedrpdown2: any = document.querySelector('select[name="account"]')
        let opts2: any = document.querySelectorAll('select[name="account"] option')
        printTypedrpdown2.value = opts2[1].value
        printTypedrpdown2.dispatchEvent(new Event('change'))

        let radio: any = document.querySelector('.cursor_pointer.ng-binding')
        radio.click()

        await sleep(1000)

        let fromDate: any = document.querySelector('input[name="fromDate"] + span button')
        fromDate.click()
        await sleep(1000)
        let fromDatePicker: any = document.querySelector('input[name="fromDate"] + ul')
        let fromDatePicker2 = fromDatePicker.querySelector('.pull-left button')
        fromDatePicker2.click()
        await sleep(1000)

        let toDate: any = document.querySelector('input[name="toDate"] + span button')
        toDate.click()
        await sleep(1000)
        let toDatePicker: any = document.querySelector('input[name="toDate"] + ul')
        let toDatePicker2 = toDatePicker.querySelector('.pull-left button')
        toDatePicker2.click()
        await sleep(1600)

        submitBtn.click()
        checkDownCsvBtn = setInterval(async () => {
          let panel: any = document.querySelector('.tranenquiry_panel:not(.ng-hide)')
          if (panel) {
            
            let err: any = document.querySelector('.tranenquiry_panel div[data-ng-show="showError"]:not(.ng-hide)')
            console.log('err: ', err);
            clearInterval(checkDownCsvBtn)
            if(err){
              clearTimeout(timer)
              clearInterval(cutDownNumTimer)
              ctx.emit('onOffHandle', false)
              ElMessage({
                message: '自动下载已关闭.没有数据',
                type: 'error',
              })
              return
            }
            await sleep(1000)
            let err2: any = document.querySelector('.tranenquiry_panel div[data-ng-show="showError"]:not(.ng-hide)')
            console.log('err2: ', err2);
            if(err2){
              clearTimeout(timer)
              clearInterval(cutDownNumTimer)
              ctx.emit('onOffHandle', false)
              ElMessage({
                message: '自动下载已关闭.没有数据',
                type: 'error',
              })
              return
            }

            let DownCsvBtn: any = document.querySelector('.tranenquiry_panel button[type="submit"]')
            let printTypedrpdown: any = document.querySelector('#printTypedrpdown')
            let opts: any = document.querySelectorAll('#printTypedrpdown option')
            printTypedrpdown.value = opts[1].value
            printTypedrpdown.dispatchEvent(new Event('change'))
            DownCsvBtn.click()
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
        }, 2000)
      } else {
        clearTimeout(timer)
        clearInterval(cutDownNumTimer)
        ctx.emit('onOffHandle', false)
        ElMessage({
          message: '自动下载已关闭.',
          type: 'error',
        })
      }
    }

    const getCookie = (name: string) => {
      var arr,
        reg = new RegExp('(^| )' + name + '=([^;]*)(;|$)')

      if ((arr = document.cookie.match(reg))) return unescape(arr[2])
      else return null
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
      // chrome.runtime.sendMessage({ type: "POPUP_INIT" }, async tab => {
      //   state.currentTab = await tab;
      //   console.log(state.currentTab);
      // });
      let _intervalTime: number = await getSyncStorage('intervalTime')
      let _reportUrl: any = await getSyncStorage('reportUrl')
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
      cutDownNum,
      helpHandle,
      dialogHelpVisible,
      submitForm,
      resetForm,
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
