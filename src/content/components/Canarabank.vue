<template>
  <div id="kk-container">
    <div style="display: flex; align-items: center; width: 350px">
      <el-icon :size="24" color="#e6a23c"><QuestionFilled /></el-icon>
      <p style="font-size: 14px; display: inline-block">
        此网站下载流水需要在流水界面 <br />
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
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, reactive, toRefs, watch } from 'vue'
import { ElMessage, ElIcon } from 'element-plus'
import { QuestionFilled } from '@element-plus/icons-vue'
import useStorage from '../useStorage'
import { sleep, Timer, eventClick } from '../../utils/index'
let timer: any = null
let timertop: any = null
let timer1: any = null
let timer2: any = null
let timer3: any = null
let timer4: any = null
let cutDownNumTimer: any = null
let checkDownCsvBtn: any = null
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
      files: {},
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
          const url = location.search
          if(url.indexOf('page=manage-accounts&state=statement') !== -1){
            download()
            ctx.emit('onOffHandle', true)
            return
          }

          // 需要点击到流水界面
          let homeBtn:any = document.querySelector('a[title="Go to Dashboard"]')
          if(homeBtn){
            homeBtn.click()
            await sleep(2000)
            let homeBtn2:any = document.querySelector('a[title="Click for View or Download Statement"]')
            homeBtn2.click()
            await sleep(2000)
            download()
            ctx.emit('onOffHandle', true)
            return
          }

          ElMessage({
            message: '请先到流水界面...',
            type: 'error',
          })
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

    const download =  async () => {
      if (!props.onOff) return
      const url = location.search
      // 顶层框架
        if(url.indexOf('page=manage-accounts&state=statement') !== -1){
          console.log('帐单页面')

          // let sel:any = document.querySelector('div.account-statement-left__selectPeriod .oj-select-choice')
          // console.log('sel: ', sel);
          // eventClick(sel)
          // await sleep(1500)

          // let lis:any = document.querySelectorAll('#oj-listbox-drop .oj-listbox-results li')
          // console.log('lis: ', lis);
          // eventClick(lis[3])
          // await sleep(1500)

          // let datedoms:any = document.querySelectorAll('.oj-inputdatetime-input-trigger span')
          // eventClick(datedoms[0])
          // await sleep(1000)

          // let today1:any = document.querySelector('.oj-enabled.oj-selected')
          // eventClick(today1)
          // await sleep(1000)

          // eventClick(datedoms[1])
          // await sleep(1000)

          // let today2:any = document.querySelector('.oj-enabled.oj-selected')
          // eventClick(today2)
          // await sleep(1000)

          let btns:any = document.querySelectorAll('.oj-button-button.oj-component-initnode')
          let el = Array.from(btns).find((item:any) => item.innerText  === 'Apply Filter')
          eventClick(el)

          checkDownCsvBtn = setInterval(async () => {
          let btns:any = document.querySelectorAll('.oj-button-button.oj-component-initnode')
          let panel = Array.from(btns).find((item:any) => item.innerText  === 'Download')
          if (panel) {
            eventClick(panel)
            clearInterval(checkDownCsvBtn)
            await sleep(1500)
            let as:any = document.querySelectorAll('.oj-menu-item')

            const eventOpts = { bubbles: true, view: window };
            as[1].dispatchEvent(new MouseEvent('mouseover', eventOpts));
            eventClick(as[1])

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
        }else{
          ElMessage({
            message: '自动下载已关闭.',
            type: 'info',
          })
          ctx.emit('onOffHandle', false)
        }
    }

    // 与后台通信
    onMounted(async () => {
      let _intervalTime: number = await getSyncStorage('intervalTime')
      let _reportUrl: any = await getSyncStorage('reportUrl')
      ruleForm.intervalTime = _intervalTime || 20
      ruleForm.reportUrl = _reportUrl || ''
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
