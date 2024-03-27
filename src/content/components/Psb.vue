<template>
  <main id="kk-container">
    <div style="display: flex; align-items: center; width: 350px">
      <el-icon :size="24" color="#e6a23c"><QuestionFilled /></el-icon>
      <p style="font-size: 14px; display: inline-block">
        此网站不支持后台下载流水，登录成功后，在detailedStatement界面，点击开关即可自动下载
      </p>
    </div>
    <section class="run-status">
      <!-- <img :src="runGifSrc"> -->
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
import { QuestionFilled } from '@element-plus/icons-vue'
import useStorage from '../useStorage'
import { sleep, Timer, simulateMouseMove } from '../../utils/index'

let timer: any = null
let timer2: any = null
let timer3: any = null
let cutDownNumTimer: any = null
let downloadTimer: any = null
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
    const step = ref(0)

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
        clearTimeout(timer2)
        clearTimeout(timer3)
        clearInterval(cutDownNumTimer)
        clearTimeout(downloadTimer)
        if (newValue) {
          let flag = checkNavPage()
          // console.log('flag: ', flag);
          if (newValue && flag) {
            download()
          } else {
            ElMessage({
              message: '[启动失败]：先确认页面是否正确.',
              type: 'error',
            })
            clearTimeout(timer)
            clearTimeout(timer2)
            clearTimeout(timer3)
            clearInterval(cutDownNumTimer)
            ctx.emit('onOffHandle', false)
          }
        }
      },
    )

    const checkNavPage = () => {
      let flag: any = false
      if (location.hash.indexOf('detailedStatement') !== -1) {
        flag = true
      } else {
        flag = false
      }
      return flag
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
          let blockOverlay: any = document.querySelector('#pageLoader')
          if (blockOverlay && blockOverlay.style === 'none') {
            clearInterval(timer)
            resolve(true)
          }
        }, 1000)
      })
    }

    const download = async () => {
      if (!props.onOff) return

      function getRandomInt(min: any, max: any) {
        return Math.floor(Math.random() * (max - min + 1)) + min
      }

      simulateMouseMove(document.body, getRandomInt(1, 100), getRandomInt(1, 100))

      let formcontrolname: any = document.querySelector('input[formcontrolname="fromDate"]')
      if (formcontrolname) {
        let dateRange: any = document.querySelector('input[value="dateRange"]')
        if (!dateRange.checked) {
          dateRange.click()
          await sleep(1500)
        }

        // let transactionCount:any = document.querySelector('input[value="transactionCount"]')
        // transactionCount.click()
        // await sleep(1500)

        formcontrolname.click()
        await sleep(1500)
        // let todaySpan: any = document.querySelector('.owl-dt-calendar-cell-today')
        let temp: any = document.querySelectorAll('.owl-dt-calendar-cell-content')

        // todaySpan.click()
        temp[20].click()
        await sleep(1500)

        let toDate: any = document.querySelector('input[formcontrolname="toDate"]')
        toDate.click()
        await sleep(1500)
        let todaySpan2: any = document.querySelector('.owl-dt-calendar-cell-today')
        todaySpan2.click()
        await sleep(1500)
        let searchBtn: any = document.querySelector('.bottom-footer1 li .btn-div:last-child button')
        searchBtn.click()

        // await checkBlockOverlay()

        let checkoutLis: any = null
        let maxNum = 100
        let num = 0
        checkoutLis = setInterval(async () => {
          let lis: any = document.querySelectorAll('#transaction li')
          num++
          if (num > maxNum) {
            clearInterval(checkoutLis)
          }
          if (lis.length) {
            clearInterval(checkoutLis)
            clearTimeout(downloadTimer)
            await sleep(2000)
            //  等待生成完成
            if (lis.length) {
              let btns: any = lis[1].querySelectorAll('button')
              btns[0].click()
              cutDownNum.value = ruleForm.intervalTime
              downloadTimer = setTimeout(() => {
                // 重置
                clearTimeout(downloadTimer)
                clearTimeout(timer)
                clearInterval(cutDownNumTimer)
                download()
              }, ruleForm.intervalTime * 1000 || 20000)
              cutDownNumTimer = setInterval(() => {
                cutDownNum.value--
                if (cutDownNum.value < 0) {
                  clearInterval(cutDownNumTimer)
                }
              }, 1000)
            }
          }
        }, 1000)
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
      let _reportUrl: any = await getSyncStorage('reportUrl')
      ruleForm.intervalTime = _intervalTime || 30
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
      submitForm,
      resetForm,
      helpHandle,
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
