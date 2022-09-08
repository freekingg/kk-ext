<template>
  <main id="kk-container">
    <div style="display: flex; align-items: center; width: 350px">
      <el-icon :size="24" color="#e6a23c" @click="helpHandle"><QuestionFilled /></el-icon>
      <p style="font-size: 14px; display: inline-block">
        此网站支持后台下载流水 <br>
        1、登录后，进入 Accounts - Account Activity 中 <br>
        2、选择相关的查询条件后，点击 Submit<br>
        3、此时会自动进行流水下载，如果想停止，刷新网页即可<br>
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
          <li>1、在流水界面执行一次查询操作，然后点击开始</li>
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
let timer1: any = null
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
    const runGifSrc = ref(chrome.runtime.getURL('img/runing.gif'))
    const state = reactive({
      currentTab: null,
      files:{}
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

    const download = () => {
      let data:any = state.files
      let body:any = ''
      for (const key in data) {
          body +=  `${key}=${encodeURIComponent(data[key])}&`
      }
      fetch("https://www.kvbin.com/B001/internet", {
        "headers": {
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
          "accept-language": "zh-CN,zh;q=0.9,en-CA;q=0.8,en;q=0.7,ja-JP;q=0.6,ja;q=0.5",
          "cache-control": "max-age=0",
          "content-type": "application/x-www-form-urlencoded",
          "sec-ch-ua": "\"Chromium\";v=\"104\", \" Not A;Brand\";v=\"99\", \"Google Chrome\";v=\"104\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "\"macOS\"",
          "sec-fetch-dest": "frame",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1"
        },
        "referrer": "https://www.kvbin.com/B001/internet",
        "referrerPolicy": "strict-origin-when-cross-origin",
        body,
        "method": "POST",
        "mode": "cors",
        "credentials": "include"
      }).then((res:any)=>{
        // 使用blob()方法获取blob对象数据
        res.blob().then(
          (res:any) => {
            const blob = new Blob([res], {
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; application/octet-stream'
            })
            const a = document.createElement('a')
            const fileUrl = window.URL.createObjectURL(blob)
            a.href = fileUrl
            a.setAttribute('download','kvb.csv' )
            a.style.display = 'none'
            a.click()
            a.remove()
            window.URL.revokeObjectURL(a.href)

            // 重置
            clearTimeout(timer1)
            clearInterval(cutDownNumTimer)
            cutDownNum.value = ruleForm.intervalTime
            timer1 = setTimeout(() => {
              download()
            }, ruleForm.intervalTime * 1000 || 20000)
            cutDownNumTimer = setInterval(() => {
              cutDownNum.value--
              console.log('下载倒计时: ', cutDownNum.value);
              if (cutDownNum.value < 0) {
                clearInterval(cutDownNumTimer)
              }
            }, 1000)

          }
        )
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
      let frame_txn: any = document.querySelector('frame[name="frame_txn"]')
      console.log('frame_txn: ', frame_txn);
      let timer: any = null
      let onOff = false
      if (frame_txn) {
        timer=setInterval(() => {
          console.log('检查是否可下载')
          let flddownload = frame_txn.contentWindow.document.querySelector('input#flddownload')
          if (flddownload) {
            let form_frmmain = frame_txn.contentWindow.document.querySelector('form[name="frmmain"]')
            let inputs = form_frmmain.querySelectorAll('input')
            let selects = form_frmmain.querySelectorAll('select')
            let files:any = {}
            
            for (const iterator of inputs) {
              files[iterator.name] = iterator.value
            }
            for (const iterator of selects) {
              files[iterator.name] = iterator.value
            }
            files['fldsearchformat']= '05'
            files['fldRequestId']= 'RRAAC05'
            
            state.files = files
            console.log('有参数了,进行下载',files)
            // if(onOff) return
            onOff = true
            download()
            clearTimeout(timer)
            clearInterval(cutDownNumTimer)
          } 
          // else {
          //   onOff = false
          //   clearTimeout(timer)
          //   clearInterval(cutDownNumTimer)
          // }
        }, 2000)
      }

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
