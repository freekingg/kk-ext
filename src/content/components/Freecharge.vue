<template>
  <div id="kk-container">
    <div style="display: flex; align-items: center; width: 350px">
      <el-icon :size="24" color="#e6a23c"><QuestionFilled /></el-icon>
      <p style="font-size: 14px; display: inline-block">此网站下载流水需要在流水界面 <br /></p>
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
        <el-form-item label="下载页数" prop="intervalTime">
          <el-input type="number" v-model="ruleForm.maxNum" />
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
import { writeFileXLSX, utils } from 'xlsx'

let timer: any = null
let timer1: any = null
let timer2: any = null
let timer3: any = null
let timer4: any = null
let timer5: any = null
let cutDownNumTimer: any = null
let checkDownCsvBtn: any = null
let transList: any = []
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
    const params = ref({})
    // const transList = ref(<any>[])

    const runGifSrc = ref(chrome.runtime.getURL('img/runing.gif'))
    const state = reactive({
      currentTab: null,
      files: {},
    })

    const { setSyncStorage, getSyncStorage } = useStorage()

    const ruleFormRef = ref()
    const dialogHelpVisible = ref(false)
    const gn = ref(0)

    const ruleForm = reactive({
      intervalTime: 20, //爬取间隔时间
      reportUrl: '', //上报接口地址
      name: 'Hello',
      data: {},
      maxNum: 5,
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
        clearInterval(timer1)
        clearInterval(timer2)
        clearInterval(timer3)
        clearInterval(timer4)
        clearInterval(timer5)
        transList = []
        if (newValue) {
          let profile: any = document.querySelector('.profile-details')
          if (profile) {
            download()
            ctx.emit('onOffHandle', true)
            return
          }
          ElMessage({
            message: '请先登录...',
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

    const getList = (body: any = {}) => {
      return new Promise((resolve, reject) => {
        let params = '{}'
        if (body.lastGlobalTxnId) {
          params = body
        }
        params = JSON.stringify(body)
        fetch('https://www.freecharge.in/thv/list', {
          referrer: 'https://www.freecharge.in/',
          referrerPolicy: 'origin',
          headers: {
            accept: 'application/json, text/plain, */*',
            'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-CA;q=0.7,ja-JP;q=0.6,ja;q=0.5',
            'content-type': 'application/json',
            // "csrfrequestidentifier": "5ee838bb-bd62-465a-87a6-f16798c980c6",
            fcchannel: '12',
            'sec-ch-ua': '"Not?A_Brand";v="8", "Chromium";v="108", "Google Chrome";v="108"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
          },
          body: params,
          // "body": "{\"lastGlobalTxnId\":\"YBLb1454eea89c14643a52f5d487b0abf33\",\"lastGlobalTxnType\":\"UPI_PAY\"}",
          method: 'POST',
          mode: 'cors',
          credentials: 'include',
        })
          .then((res) => {
            return res.json()
          })
          .then((res) => {
            console.log(res)
            if (res.length) {
              resolve(res)
            } else {
              resolve([])
            }
          })
      })
    }

    const getAllList = async () => {
      await sleep(5000)
      let list: any = await getList(params.value)
      gn.value++
      if (list.length) {
        transList = [...list, ...transList]
        let last = list[list.length - 1]
        params.value = {
          lastGlobalTxnId: last.globalTxnId,
          lastGlobalTxnType: last.globalTxnType,
        }
        if (gn.value < ruleForm.maxNum) {
          getAllList()
        } else {
          console.log('ok', transList)
          let newList = transList.map((item:any) => {
            return {
              ...item,
              txnHistory:JSON.stringify(item.txnHistory)
            }
          })
          const ws = utils.json_to_sheet(newList)
          const wb = utils.book_new()
          utils.book_append_sheet(wb, ws, 'Data')
          writeFileXLSX(wb, 'SheetJSVueAoO.xlsx')

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
      }
    }

    const download = async () => {
      if (!props.onOff) return
      let lis: any = document.querySelectorAll('.primary-list li')
      if (lis.length) {
        gn.value = 0
        transList = []
        // lis[6].click()
        // await sleep(3000)
        // lis[7].click()

        let initList: any = await getList()
        if (initList.length) {
          transList = [...initList]
          console.log('transList.value: ', transList)
          let last = initList[initList.length - 1]
          params.value = {
            lastGlobalTxnId: last.globalTxnId,
            lastGlobalTxnType: last.globalTxnType,
          }
          getAllList()
        }
      }
    }

    // 与后台通信
    onMounted(async () => {
      let _intervalTime: number = await getSyncStorage('intervalTime')
      let maxNum: number = await getSyncStorage('maxNum')
      let _reportUrl: any = await getSyncStorage('reportUrl')
      ruleForm.intervalTime = _intervalTime || 20
      ruleForm.reportUrl = _reportUrl || ''
      ruleForm.maxNum = maxNum || 5
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
