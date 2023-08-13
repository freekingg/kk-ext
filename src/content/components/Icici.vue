<template>
  <main id="kk-container">
    <!-- <div style="display: flex; align-items: center; width: 350px">
      <el-icon :size="24" color="#e6a23c"><QuestionFilled /></el-icon>
      <p style="font-size: 14px; display: inline-block">
        此网站支持后台下载流水，需要流水界面进行一次下载
      </p>
    </div> -->
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
          <!-- <el-button type="primary" @click="injectHandle">注入</el-button> -->
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
        <!-- <el-form-item label="上报接口" prop="reportUrl">
          <el-input v-model="ruleForm.reportUrl" />
        </el-form-item> -->
        <el-form-item label="请求参数">
          <el-input v-model="data" type="textarea" disabled />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="submitForm(ruleFormRef)">保存</el-button>
        </el-form-item>
      </el-form>
    </section>
    <div class="btn-area" style="display: flex; justify-content: center; margin-bottom: 10px">
      <el-button type="primary" @click="startHandle">下载流水</el-button>
      <el-button type="primary" @click="transForPageHandle">转账</el-button>
    </div>
  </main>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, reactive, toRefs, watch } from 'vue'
import { ElMessage, ElIcon } from 'element-plus'
import { QuestionFilled } from '@element-plus/icons-vue'
import useStorage from '../useStorage'
import { sleep, Timer, eventClick } from '../../utils/index'
import dayjs from 'dayjs'
let timer: any = null
let cutDownNumTimer: any = null
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
    const isINjected = ref(false)
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
        if (newValue) {
          // let selectv:any = document.querySelector('#detailcolor.account-active')
          // let qlink:any = document.querySelectorAll('.quick-link-menu a')
          // if (!selectv) {
          //   ElMessage({
          //     message: '[启动失败]：请确认当前在流水查询页面.',
          //     type: 'error',
          //   })
          //   ctx.emit('onOffHandle', false)
          //   clearTimeout(timer)
          //   clearInterval(cutDownNumTimer)
          // } else
          // {
          let mode: any = await getSyncStorage('mode')
          let qlink: any = document.querySelectorAll('.quick-link-menu a')
          setSyncStorage({ onOff: true })
          if (qlink && qlink.length) {
            if (mode === 'download') {
              let qlink2: any = Array.from(qlink).find(
                (item: any) => item.innerText === 'Detailed Statement',
                )
                console.log('qlink2: ', qlink2);
              qlink2.click()
              return
            }
          }
          // else{
          //   let home:any =  document.querySelector('#home a')
          //   console.log('home: ', home);
          //   home.click()
          //   return
          // }

          ElMessage({
            message: '[任务执行成功].',
            type: 'success',
          })
          download()
          // timer = setInterval(() => {
          //   download()
          // }, ruleForm.intervalTime * 1000 || 30000)
          // }
        } else if (!newValue) {
          ElMessage({
            message: '[任务已经关闭].',
            type: 'info',
          })
          clearTimeout(timer)
          clearInterval(cutDownNumTimer)
          setSyncStorage({ onOff: false })
        } else {
          ElMessage({
            message: '[启动失败]：请下载一次流水操作.',
            type: 'error',
          })
          clearTimeout(timer)
          clearInterval(cutDownNumTimer)
          ctx.emit('onOffHandle', false)
          setSyncStorage({ onOff: false })
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

    const startHandle = async () => {
      setSyncStorage({ mode: 'download' })
      ctx.emit('onOffHandle', true)
      await sleep(500)
      let home: any = document.querySelector('#home a')
      home.click()
    }
    const transForPageHandle = async () => {
      setSyncStorage({ mode: 'transer' })
      ctx.emit('onOffHandle', false)
      let home: any = document.querySelector('#home a')
      home.click()
    }

    const download = async () => {
      // let selectv:any = document.querySelector('select[name="TransactionHistoryFG.FORMAT_WIDGET"]')
      let selectv: any = document.querySelector('#detailcolor.account-active')
      if (!selectv || !props.onOff) return
      let selectv2: any = document.querySelector('#detailcolor.account-active span')
      selectv2.click()
      await sleep(1000)

      // let todaybtn:any = document.querySelector("button[onclick=\"todayStmnt('dd/MM/yyyy','PageConfigurationMaster_COAUX3W__1')\"]")
      let btns: any = document.querySelectorAll('.statement-selector .filter-day-button')
      let todaybtn: any = Array.from(btns).find((item: any) => item.innerText === 'Today')
      if (todaybtn) {
        todaybtn.click()
        await sleep(1000)

        let startInput:any = document.getElementById('PageConfigurationMaster_CDESTW__1:TransactionHistoryFG.FROM_TXN_DATE')
        const syn2 = startInput.value.indexOf('-')
        let format = 'DD/MM/YYYY'
        if(syn2 !== -1){
          format = 'DD-MM-YYYY'
        }
        console.log('format: ', format);

        let endday = dayjs().add(2,'day').format(format)
        let endInput:any = document.getElementById('PageConfigurationMaster_CDESTW__1:TransactionHistoryFG.TO_TXN_DATE')
        endInput.value = endday

        await sleep(1000)

        let dsc: any = document.querySelector('input[value="DSC"]')
        if (dsc) {
          dsc.click()
          await sleep(1000)
        }

        let downbtn: any = document.querySelector('input[name="Action.SEARCH"]')
        downbtn.click()

        await checkBlockOverlay()

        let sel: any = document.querySelector('span[name="TransactionHistoryFG.OUTFORMAT"]')
        sel.click()
        await sleep(1000)
        let uls: any = document.querySelector(
          '.selectboxit-options.selectboxit-list.dropDownMargin',
        )
        let lis: any = uls.querySelectorAll('li')
        eventClick(lis[4])
        await sleep(1000)
        eventClick(lis[0])
      }

      // 重置
      clearTimeout(timer)
      clearInterval(cutDownNumTimer)
      cutDownNum.value = ruleForm.intervalTime
      timer = setTimeout(() => {
        download()
      }, ruleForm.intervalTime * 1000 || 30000)
      cutDownNumTimer = setInterval(() => {
        cutDownNum.value--
        if (cutDownNum.value < 0) {
          clearInterval(cutDownNumTimer)
        }
        let apzloader = document.querySelector('#apzloader')
        if (apzloader) {
          if (!apzloader.classList.contains('dispnone')) apzloader.classList.add('dispnone')
        }
      }, 1000)
    }

    const resetForm = (formEl: any) => {
      if (!formEl) return
      formEl.resetFields()
    }

    const settingVisibleHandle = () => {
      settingVisible.value = !settingVisible.value
    }

    const injectHandle = () => {
      var s = document.createElement('script')
      s.src = chrome.runtime.getURL('js/ujjivansfb.js')
      s.onload = function () {
        s.remove()
      }
      if (document.body || document.head) {
        ;(document.body || document.head).appendChild(s)
      }
    }

    // 与后台通信
    onMounted(async () => {
      // chrome.runtime.sendMessage({ type: "POPUP_INIT" }, async tab => {
      //   state.currentTab = await tab;
      //   console.log(state.currentTab);
      // });
      let _intervalTime: number = await getSyncStorage('intervalTime')
      let _reportUrl: any = await getSyncStorage('reportUrl')
      ruleForm.intervalTime = _intervalTime || 30
      ruleForm.reportUrl = _reportUrl || ''

      let mode: any = await getSyncStorage('mode')
      let onOff: any = (await getSyncStorage('onOff')) || false
      if (onOff) {
        ctx.emit('onOffHandle', onOff)

        if (mode === 'download') {
          let qlink: any = document.querySelectorAll('.quick-link-menu a')
          if (qlink && qlink.length) {
            setSyncStorage({ mode: 'download' })
            qlink[0].click()
          }
        }
      }

      if (mode === 'transer') {
        ctx.emit('onOffHandle', false)
        let qlink: any = document.querySelectorAll('.quick-link-menu a')
        if (qlink && qlink.length) {
          let qlink2: any = Array.from(qlink).find(
            (item: any) => item.innerText === ' Fund Transfers',
          )
          qlink2.click()
        }
      }
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
      startHandle,
      transForPageHandle,
      injectHandle,
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
