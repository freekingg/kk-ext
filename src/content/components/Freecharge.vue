<template>
  <div id="kk-container">
    <div style="display: flex; align-items: center; width: 350px">
      <el-icon :size="24" color="#e6a23c"><QuestionFilled /></el-icon>
      <p style="font-size: 14px; display: inline-block">此网站支持接口模式下载 <br /></p>
    </div>
    <section class="run-status">
      <!-- <img :src="runGifSrc"> -->
      <el-result icon="info" :title="onOff ? '运行中' + cutDownNum + 's' : '未启动'">
        <template #icon>
          <span>{{ currentStatus }}</span>
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
        <el-form-item label="请求间隔(s)" prop="spaceTime">
          <el-input type="number" v-model="ruleForm.spaceTime" />
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
    const currentStatus = ref(<any>'')
    // const transList = ref(<any>[])

    const runGifSrc = ref(chrome.runtime.getURL('img/runing.gif'))
    const state = reactive({
      currentTab: null,
      files: {},
    })

    const { setSyncStorage, getSyncStorage } = useStorage()

    const ruleFormRef = ref()
    const dialogHelpVisible = ref(false)
    const gn = ref(1)

    const ruleForm = reactive({
      intervalTime: 20, //爬取间隔时间
      spaceTime: 3,
      reportUrl: '', //上报接口地址
      name: 'Hello',
      data: {},
      maxNum: 5,
    })
    const rules = reactive({
      intervalTime: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
      spaceTime: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
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
        gn.value = 1
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
            let json = null
            try {
              json = res.json()
            } catch (error) {
              console.log('error: ', error)
            }
            return json
          })
          .then((res) => {
            if (res && res.length) {
              resolve({ status: true, list: res })
            } else {
              resolve({ status: true, list: [] })
            }
          })
          .catch((err) => {
            console.log('err: ', err)
            resolve({ status: false, list: [] })
          })
      })
    }

    const downloadFile = async (flag: Boolean = true) => {
      let newList = transList.map((item: any) => {
        return {
          ...item,
          txnHistory: JSON.stringify(item.txnHistory),
        }
      })
      const ws = utils.json_to_sheet(newList)
      const wb = utils.book_new()
      utils.book_append_sheet(wb, ws, 'Data')
      writeFileXLSX(wb, 'FreechargeSheet.xlsx')
      if (flag) {
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

    const getAllList = async () => {
      let spaceTime = ruleForm.spaceTime || 3
      await sleep(spaceTime * 1000)
      let { status, list }: any = await getList(params.value)
      if (status) {
        gn.value++
        currentStatus.value = `当前下载进度：第 ${gn.value} 页,共 ${ruleForm.maxNum} 页`
        transList = [...list, ...transList]
        if(list.length === 0){
          console.log('没有数据了，', transList.length)
          currentStatus.value = `当前下载进度：第 ${gn.value} 页,本轮提前下载完成`
          downloadFile()
          return
        }
        let last = list[list.length - 1]
        params.value = {
          lastGlobalTxnId: last.globalTxnId,
          lastGlobalTxnType: last.globalTxnType,
        }


        let maxNum: number = await getSyncStorage('maxNum')
        ruleForm.maxNum = maxNum || 5
        
        if (gn.value <= ruleForm.maxNum && props.onOff) {
          getAllList()
        } else {
          console.log('本轮拉取完成,共', transList.length)
          currentStatus.value = `当前下载进度：本轮下载完成`
          downloadFile()
        }
      } else {
        ruleForm.maxNum = 10
        getAllList()
      }
    }

    const download = async () => {
      if (!props.onOff) {
        clearTimeout(timer)
        clearInterval(cutDownNumTimer)
        return
      }
      let navs: any = document.querySelectorAll('.primary-list li')
      currentStatus.value = null
      gn.value = 1
      transList = []

      if (navs && navs.length) {
        currentStatus.value = `当前下载进度：第 ${gn.value} 页,共 ${ruleForm.maxNum} 页`
        let { status, list }: any = await getList()
        if (status && list.length) {
          transList = [...list]
          // downloadFile(false)
          let last = list[list.length - 1]
          params.value = {
            lastGlobalTxnId: last.globalTxnId,
            lastGlobalTxnType: last.globalTxnType,
          }
          getAllList()
        } else {
          await sleep(3000)
          download()
        }
      }
    }

    // 与后台通信
    onMounted(async () => {
      let _intervalTime: number = await getSyncStorage('intervalTime')
      let _spaceTime: number = await getSyncStorage('spaceTime')
      let maxNum: number = await getSyncStorage('maxNum')
      let _reportUrl: any = await getSyncStorage('reportUrl')
      ruleForm.intervalTime = _intervalTime || 20
      ruleForm.spaceTime = _spaceTime || 3

      
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
      currentStatus,
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
