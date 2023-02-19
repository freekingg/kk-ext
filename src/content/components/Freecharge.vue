<template>
  <div id="kk-container">
    <div style="display: flex; align-items: center; width: 350px">
      <el-icon :size="24" color="#e6a23c"><QuestionFilled /></el-icon>
    </div>
    <section class="run-status">
      <!-- <img :src="runGifSrc"> -->
      <el-result icon="info" :title="onOff ? '运行中' + cutDownNum + 's' : '未启动'">
        <template #icon>
          <p>{{ currentStatus }}</p>
          <p style="color: darkgoldenrod;">{{ current2Status }}</p>
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
        <el-form-item label="下载页数" prop="maxNum">
          <el-input type="number" v-model="ruleForm.maxNum" />
        </el-form-item>
        <!-- <el-form-item label="上报接口" prop="reportUrl">
          <el-input v-model="ruleForm.reportUrl" />
        </el-form-item> -->
        <el-form-item label="请求间隔(s)" prop="spaceTime">
          <el-input type="number" v-model="ruleForm.spaceTime" />
        </el-form-item>
        <el-form-item label="同时下载全流水">
          <el-checkbox v-model="ruleForm.downloadAll" label="是" size="large" />
        </el-form-item>
        <!-- <el-form-item label="请求参数">
          <el-input v-model="data" type="textarea" disabled />
        </el-form-item> -->
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

let downloadTimer: any = null
let downloadTimerTotal: any = null
let cutDownNumTimer: any = null
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
    const currentStatus = ref(<any>'')
    const current2Status = ref(<any>'')

    const runGifSrc = ref(chrome.runtime.getURL('img/runing.gif'))
    const state = reactive({
      currentTab: 1,
      files: {},
      pageNum:1,
      pageNumTotal:1,
      params:{},
      paramsTotal:{},
      recordList:<any>[],
      recordListTotal:<any>[]
    })

    const { setSyncStorage, getSyncStorage } = useStorage()

    const ruleFormRef = ref()
    const dialogHelpVisible = ref(false)

    const ruleForm = reactive({
      intervalTime: 20, //爬取间隔时间
      spaceTime: 3,
      reportUrl: '', //上报接口地址
      name: 'Hello',
      data: {},
      maxNum: 5,
      downloadAll: true,
    })
    const rules = reactive({
      intervalTime: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
      spaceTime: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
      maxNum: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
      desc: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
    })

    watch(
      () => props.onOff,
      async (newValue) => {
        clearTimeout(downloadTimer)
        clearTimeout(downloadTimerTotal)
        clearInterval(cutDownNumTimer)
        state.recordList = []
        state.recordListTotal = []
        state.pageNum = 1
        state.pageNumTotal = 1
        if (newValue) {
          let profile: any = document.querySelector('.profile-details')
          if (profile) {
            download()
            if(ruleForm.downloadAll){
              setTimeout(() => {
                downloadTotal()
             }, 5000);
            }
            ctx.emit('onOffHandle', true)
            return
          }
          ElMessage({
            message: '请先登录...',
            type: 'error',
          })
          ctx.emit('onOffHandle', false)
        } else {
          setSyncStorage({ onOff: false })
          ElMessage({
            message: '[任务已经关闭].',
            type: 'info',
          })
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

    const downloadFile = async (list:any=[], flag: Boolean = true) => {
      let newList = list.map((item: any) => {
        return {
          ...item,
          txnHistory: JSON.stringify(item.txnHistory),
        }
      })
      const ws = utils.json_to_sheet(newList)
      const wb = utils.book_new()
      utils.book_append_sheet(wb, ws, 'Data')
      writeFileXLSX(wb, 'FreechargeSheet.xlsx')
    }

    const getAllList = async () => {
      let spaceTime = ruleForm.spaceTime || 3
      await sleep(spaceTime * 1000)
      let { status, list }: any = await getList(state.params)
      if (status) {
        state.pageNum++
        currentStatus.value = `实时下载进度：第 ${state.pageNum} 页,共 ${ruleForm.maxNum} 页`
        state.recordList = [...list, ...state.recordList]
        if(list.length === 0){
          console.log('没有数据了，', state.recordList.length)
          currentStatus.value = `实时下载进度：第 ${state.pageNum} 页,本轮提前下载完成`
          downloadFile(state.recordList)
          // 重置
          clearTimeout(downloadTimer)
          clearInterval(cutDownNumTimer)
          cutDownNum.value = ruleForm.intervalTime
          downloadTimer = setTimeout(() => {
            download()
          }, ruleForm.intervalTime * 1000 || 20000)
          cutDownNumTimer = setInterval(() => {
            cutDownNum.value--
            if (cutDownNum.value < 0) {
              clearInterval(cutDownNumTimer)
            }
          }, 1000)
          return
        }
        let last = list[list.length - 1]
        state.params = {
          lastGlobalTxnId: last.globalTxnId,
          lastGlobalTxnType: last.globalTxnType,
        }

        let maxNum: number = 5
       try {
        maxNum = await getSyncStorage('maxNum')
        ruleForm.maxNum = maxNum || 5
       } catch (error) {
        ruleForm.maxNum = 5
       }
        
        if (state.pageNum <= ruleForm.maxNum && props.onOff) {
          getAllList()
        } else {
          console.log('本轮拉取完成,共', state.recordList.length)
          currentStatus.value = `实时下载进度：本轮下载完成`
          downloadFile(state.recordList)
          // 重置
          clearTimeout(downloadTimer)
          clearInterval(cutDownNumTimer)
          cutDownNum.value = ruleForm.intervalTime
          downloadTimer = setTimeout(() => {
            download()
          }, ruleForm.intervalTime * 1000 || 20000)
          cutDownNumTimer = setInterval(() => {
            cutDownNum.value--
            if (cutDownNum.value < 0) {
              clearInterval(cutDownNumTimer)
            }
          }, 1000)
        }
      } else {
        ruleForm.maxNum = 10
        getAllList()
      }
    }

    const getTotalList = async () => {
      let spaceTime = ruleForm.spaceTime || 3
      await sleep(spaceTime * 1000)
      let { status, list }: any = await getList(state.paramsTotal)
      if (status) {
        state.pageNumTotal++
        current2Status.value = `总流水下载进度：第 ${state.pageNumTotal} 页`
        state.recordListTotal = [...list, ...state.recordListTotal]
        if(list.length === 0){
          console.log(`全流水没数据了,共${state.pageNumTotal}页`, state.recordListTotal.length)
          current2Status.value = `总流水下载完成：共下载 ${state.pageNumTotal} 页`
          downloadFile(state.recordListTotal)
          // 重置
          clearTimeout(downloadTimerTotal)
          downloadTimerTotal = setTimeout(() => {
            downloadTotal()
          }, ruleForm.intervalTime * 1000 || 20000)
          return
        }
        let last = list[list.length - 1]
        state.paramsTotal = {
          lastGlobalTxnId: last.globalTxnId,
          lastGlobalTxnType: last.globalTxnType,
        }

        let maxNum: number = 500
        if (state.pageNumTotal <= maxNum && props.onOff && ruleForm.downloadAll) {
          getTotalList()
        } else {
          console.log(`全流水下载完成,共${state.pageNumTotal}页`, state.recordListTotal.length)
          current2Status.value = `总流水下载完成：第 ${state.pageNumTotal} 页`
          downloadFile(state.recordListTotal)
          // 重置
        clearTimeout(downloadTimerTotal)
        downloadTimerTotal = setTimeout(() => {
          downloadTotal()
        }, ruleForm.intervalTime * 1000 || 20000)
        }
      } else {
        getTotalList()
      }
    }

    const download = async () => {
      console.log(props.onOff);
      if (!props.onOff) {
        clearTimeout(downloadTimer)
        clearInterval(cutDownNumTimer)
        return
      }
      let navs: any = document.querySelectorAll('.primary-list a')
      currentStatus.value = null
      state.pageNum = 1
      state.recordList = []
      if (navs && navs.length) {
        currentStatus.value = `实时下载进度：第 ${state.pageNum} 页,共 ${ruleForm.maxNum} 页`
        let { status, list }: any = await getList()
        if (status && list.length) {
          state.recordList = [...list]
          let last = list[list.length - 1]
          state.params = {
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

    const downloadTotal = async () => {
      if (!props.onOff || !ruleForm.downloadAll) {
        clearTimeout(downloadTimerTotal)
        return
      }
      let navs: any = document.querySelectorAll('.primary-list a')
      current2Status.value = null
      state.pageNumTotal = 1
      state.recordListTotal = []

      if (navs && navs.length) {
        current2Status.value = `总流水下载进度：第 ${state.pageNumTotal} 页`
        let { status, list }: any = await getList()
        if (status && list.length) {
          state.recordListTotal = [...list]
          let last = list[list.length - 1]
          state.paramsTotal = {
            lastGlobalTxnId: last.globalTxnId,
            lastGlobalTxnType: last.globalTxnType,
          }
          getTotalList()
        } else {
          await sleep(3000)
          downloadTotal()
        }
      }
    }

    // 与后台通信
    onMounted(async () => {
      let _intervalTime: number = await getSyncStorage('intervalTime')
      let _spaceTime: number = await getSyncStorage('spaceTime')
      let maxNum: number = 5
      try {
        maxNum = await getSyncStorage('maxNum')
      } catch (error) {
        console.log('error: ', error);
        maxNum = 5
      }
      console.log('maxNum: ', maxNum);
      let _reportUrl: any = await getSyncStorage('reportUrl')
      let downloadAll: any = await getSyncStorage('downloadAll')
      console.log('downloadAll: ', downloadAll);

      
      ruleForm.intervalTime = _intervalTime || 20
      ruleForm.spaceTime = _spaceTime || 3
      ruleForm.reportUrl = _reportUrl || ''
      ruleForm.maxNum = maxNum || 5
      ruleForm.downloadAll = downloadAll ? true : false
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
      current2Status,
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
