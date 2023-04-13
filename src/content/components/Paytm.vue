<template>
  <main id="kk-container">
    <div style="width: 350px">
      <p style="font-size: 14px">此网站支持后台下载流水</p>
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
        label-width="140px"
        class="demo-ruleForm"
        status-icon
      >
        <el-form-item label="爬取日期(默认当天)" prop="date">
          <el-input v-model="ruleForm.date" />
        </el-form-item>
        <el-form-item label="爬取页数(默认全部)" prop="total">
          <el-input type="number" v-model="ruleForm.total" />
        </el-form-item>
        <el-form-item label="爬取间隔(s)" prop="intervalTime">
          <el-input type="number" v-model="ruleForm.intervalTime" />
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
          <li>1、需要在流水界面点击一次查询，类型选择"onscren"</li>
          <li>2、点击开关开始即可</li>
          <li>3、间隔时间在配置里面改</li>
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
import { defineComponent, ref, onMounted, reactive, toRefs, watch, toRaw } from 'vue'
import { ElMessage, ElIcon } from 'element-plus'
import { QuestionFilled } from '@element-plus/icons-vue'
import useStorage from '../useStorage'
import dayjs from 'dayjs'
import { writeFileXLSX, utils } from 'xlsx'

let timer: any = null
let cutDownNumTimer: any = null
let delayTimer: any = null
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
      date: '', //上报接口地址
      total: 9999,
      name: 'Hello',
      lastTransactionId: '',
      lastTransactionPostedDateEpoch: '',
      offset: 0,
      data: {},
      dataList: [],
    })
    const rules = reactive({
      intervalTime: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
      desc: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
    })

    watch(
      () => props.onOff,
      (newValue) => {
        if (props.data) {
          let parseProps = JSON.parse(props.data)
          console.log('parseProps:- ', parseProps)
        }

        const cEvt = new CustomEvent('paytmEvent', {
          detail: {
            type: 'start',
            data: toRaw(ruleForm),
          },
        })
        document.dispatchEvent(cEvt)
        clearInterval(delayTimer)
        if (newValue) {
          let userName: any = document.querySelector('.userName')
          let xsrfToken = localStorage.getItem('xsrfToken')
          console.log('xsrfToken: ', xsrfToken)
          if (!userName || !xsrfToken) {
            ElMessage({
              message: '[启动失败]：请确认是否登录.',
              type: 'error',
            })
            ctx.emit('onOffHandle', false)
            clearTimeout(timer)
            clearInterval(cutDownNumTimer)
          } else {
            ElMessage({
              message: '[任务执行成功].',
              type: 'success',
            })
            download()
            // timer = setInterval(() => {
            //   download()
            // }, ruleForm.intervalTime * 1000 || 30000)
          }
        } else if (!newValue) {
          ElMessage({
            message: '[任务已经关闭].',
            type: 'info',
          })
          clearTimeout(timer)
          clearInterval(cutDownNumTimer)
        } else {
          ElMessage({
            message: '[启动失败]：请下载一次流水操作(onscren).',
            type: 'error',
          })
          clearTimeout(timer)
          clearInterval(cutDownNumTimer)
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

    const downloadFile = async (list: any = [], flag: Boolean = true) => {
      let newList = list
      const ws = utils.json_to_sheet(newList)
      const wb = utils.book_new()
      utils.book_append_sheet(wb, ws, 'Data')
      writeFileXLSX(wb, 'payTmSheet.xlsx')
    }

    const download = () => {
      let xsrfToken = localStorage.getItem('xsrfToken')
      if (!props.onOff || !xsrfToken) return

      
      const fromDate = dayjs(ruleForm.date).startOf('day').unix()
      const toDate = dayjs(ruleForm.date).endOf('day').unix()
      const lastTransactionId = ruleForm.lastTransactionId || ''
      const offset = ruleForm.offset
      const lastTransactionPostedDateEpoch = ruleForm.lastTransactionPostedDateEpoch || ''

      console.log('date', ruleForm.date);
      console.log('fromDate', fromDate);
      console.log('toDate', toDate);

      fetch(
        `https://netbanking.paytmbank.com/v1/api/personal/ca/statements?fromDate=${fromDate}&toDate=${toDate}&lastTransactionId=${lastTransactionId}&lastTransactionPostedDateEpoch=${lastTransactionPostedDateEpoch}&offset=${offset}`,
        {
          headers: {
            accept: 'application/json, text/plain, */*',
            'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-CA;q=0.7,ja-JP;q=0.6,ja;q=0.5',
            'cbp-x-tk': xsrfToken || '',
            'sec-ch-ua': '"Google Chrome";v="111", "Not(A:Brand";v="8", "Chromium";v="111"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
          },
          referrer: 'https://netbanking.paytmbank.com/personal/ca/passbook',
          referrerPolicy: 'strict-origin-when-cross-origin',
          body: null,
          method: 'GET',
          mode: 'cors',
          credentials: 'include',
        },
      )
        .then((result) => {
          result
            .json()
            .then((resp) => {
              console.log(resp)
              let transactions: [] = resp.transactions
              ruleForm.lastTransactionId = resp.lastTransactionId
              ruleForm.lastTransactionPostedDateEpoch = resp.lastTransactionPostedDateEpoch
              if (transactions) {
                if (
                  resp.transactions &&
                  resp.transactions.length &&
                  ruleForm.offset < ruleForm.total
                ) {
                  ruleForm.offset += 1
                  ruleForm.dataList.push(...transactions)
                  setTimeout(() => {
                    download()
                  }, 1000)
                } else {
                  ruleForm.dataList.push(...transactions)
                  let resultList: any = JSON.parse(JSON.stringify(ruleForm.dataList))
                  console.log('下载完成了', resultList)
                  downloadFile(resultList)
                  ruleForm.offset = 0
                  ruleForm.dataList = []
                  ruleForm.lastTransactionId = ''
                  ruleForm.lastTransactionPostedDateEpoch = ''
                  cutDownNum.value = ruleForm.intervalTime
                  delayTimer = setTimeout(() => {
                    console.log(`等待${ruleForm.intervalTime}秒再下一轮`)
                    download()
                  }, ruleForm.intervalTime * 1000)
                  cutDownNumTimer = setInterval(() => {
                    cutDownNum.value--
                    if (cutDownNum.value < 0) {
                      clearInterval(cutDownNumTimer)
                    }
                  }, 1000)
                }
              }
            })
            .catch((err) => {
              console.log('err: ', err)
            })
        })
        .catch((err) => {
          console.log(err)
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
      let _autoLickTime: number = await getSyncStorage('autoLickTime')

      ruleForm.date = dayjs().startOf('day').format('YYYY/MM/DD')
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
<style>
.el-popover.el-popper {
  z-index: 9999999 !important;
}
</style>
