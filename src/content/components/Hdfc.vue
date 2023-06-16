<template>
  <main id="kk-container">
    <div style="display: flex; align-items: center; width: 350px">
      <el-icon :size="24" color="#e6a23c" @click="helpHandle"><QuestionFilled /></el-icon>
      <p style="font-size: 14px; display: inline-block; margin: 0">
        此网站支持不后台下载流水，需要停留在流水界面(personal>save>accounts),直接点开始即可
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
import { writeFileXLSX, utils } from 'xlsx'
import { sleep, Timer } from '../../utils/index'
let timer: any = null
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
    const cutDownNum = ref(30)
    const settingVisible = ref(false)
    const runGifSrc = ref(chrome.runtime.getURL('img/runing.gif'))
    const state = reactive({
      currentTab: null,
    })

    const { setSyncStorage, getSyncStorage } = useStorage()

    const ruleFormRef = ref()
    const dialogHelpVisible = ref(false)
    const outEncryptValue = ref('')
    const reqBody = ref({})

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
      () => props.data,
      async (newValue) => {
        let newProps = JSON.parse(newValue)
        if (newProps.type === 'hdfcList') {
          if (newProps.data.AccountStatementResModel?.miniTransactionDetailsDTOs) {
            downloadFile(newProps.data.AccountStatementResModel?.miniTransactionDetailsDTOs)
          }
        }

        if (newProps.type === 'updateHdfcOutEncryptValue') {
          if (newProps.outEncryptValue) {
            console.log('outEncryptValue: ', newProps.outEncryptValue)
            outEncryptValue.value = newProps.outEncryptValue
            setSyncStorage({ outEncryptValue: newProps.outEncryptValue })
          }
        }

        if (newProps.type === 'updateHdfcParms') {
          reqBody.value = newProps.data
          console.log('请求参数已更新.可以进行下载了')
          setSyncStorage({ reqBody: newProps.data })
          ElMessage({
            message: '请求参数已更新.可以进行下载了',
            type: 'success',
          })
        }
      },
    )

    watch(
      () => props.onOff,
      async (newValue) => {
        clearTimeout(timer)
        clearInterval(cutDownNumTimer)
        clearInterval(checkDownCsvBtn)
        if (newValue) {
          setSyncStorage({ onOff: newValue })

          // downloadForApi()
          // return
          let downloadBtn = document.querySelector('.data-download')
          // 如果有下载按钮，
          if (downloadBtn) {
            ElMessage({
              message: '[任务执行成功].',
              type: 'success',
            })
            download2()
            // download()
            return
          } else {
            ElMessage({
              message: '[请确认已经登录].',
              type: 'error',
            })
            setSyncStorage({ onOff: false })
            ctx.emit('onOffHandle', false)
            return
          }
        } else if (!newValue) {
          setSyncStorage({ onOff: false })
          ElMessage({
            message: '[任务已经关闭].',
            type: 'error',
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

    const downloadFile = async (list: any = []) => {
      // let newList = list.map((item: any) => {
      //   return {
      //     ...item,
      //     txnHistory: JSON.stringify(item.txnHistory),
      //   }
      // })
      if (!list.length) return
      const ws = utils.json_to_sheet(list)
      const wb = utils.book_new()
      utils.book_append_sheet(wb, ws, 'Data')
      writeFileXLSX(wb, 'hdfc.xlsx')
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

    const downloadForApi = async () => {
      if (!props.onOff) return
      fetch('https://netportal.hdfcbank.com/services/proxy/current/viewAccountStmtCASADtls', {
        headers: {
          accept: 'application/json',
          'accept-language': 'zh,zh-CN;q=0.9,en;q=0.8,en-CA;q=0.7,ja-JP;q=0.6,ja;q=0.5',
          channelindicator: 'NB',
          'content-type': 'application/json',
          fldappid: 'RS',
          inencryptvalue: outEncryptValue.value,
          parentflag: 'Y',
          'sec-ch-ua': '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
        },
        referrer: 'https://netportal.hdfcbank.com/personal/save/accounts',
        referrerPolicy: 'strict-origin',
        body: JSON.stringify(reqBody.value),
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
      }).then((result) => {
        result
          .json()
          .then((result) => {
            // console.log('result: ', result)
            if (result?.outEncryptValue) {
              outEncryptValue.value = result.outEncryptValue
              setSyncStorage({ outEncryptValue: result.outEncryptValue })
            }
            const cEvt = new CustomEvent('hdfcEvent', {
              detail: {
                type: 'jiemi',
                data: result,
              },
            })
            document.dispatchEvent(cEvt)
            // 重置
            clearTimeout(timer)
            clearInterval(cutDownNumTimer)
            cutDownNum.value = ruleForm.intervalTime
            timer = setTimeout(() => {
              downloadForApi()
            }, ruleForm.intervalTime * 1000 || 20000)
            cutDownNumTimer = setInterval(() => {
              cutDownNum.value--
              if (cutDownNum.value < 0) {
                clearInterval(cutDownNumTimer)
              }
            }, 1000)
          })
          .catch((err) => {
            console.log('err: ', err)
          })
      })
    }

    const download2 = async () => {
      if (!props.onOff) return
      await sleep(1500)
      let selectConrl: any = document.querySelector(
        '.accounts-statement-style hdfc-dropdown .input-box .dropdown .btn.btn-default.form-control',
      )
      if (selectConrl) {
        selectConrl.click()
        await sleep(1500)

        let currentMonth: any = document.querySelector('#ui-select-choices-row-0-1')
        if (currentMonth) {
          currentMonth.click()
          await sleep(3000)
          // 重置
          clearTimeout(timer)
          clearInterval(cutDownNumTimer)
          cutDownNum.value = ruleForm.intervalTime
          timer = setTimeout(() => {
            download2()
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
      await sleep(1500)
      let selectConrl: any = document.querySelector(
        '.accounts-statement-style hdfc-dropdown .input-box .dropdown .btn.btn-default.form-control',
      )
      if (selectConrl) {
        selectConrl.click()
        await sleep(1500)

        let currentMonth: any = document.querySelector('#ui-select-choices-row-0-1')
        if (currentMonth) {
          currentMonth.click()
          await sleep(3000)

          let downBtn: any = document.querySelectorAll(
            '.accounts-statement-style .data-download>.btn-default',
          )[1]
          downBtn.click()
          await sleep(1000)

          let selectConrl2: any = document.querySelectorAll(
            '.ui-select-bootstrap>.ui-select-match>.btn',
          )[1]
          if (selectConrl2) {
            selectConrl2.click()
            await sleep(1000)
            let sc: any = document.querySelectorAll(
              '.ui-select-bootstrap>.ui-select-choices, .ui-select-bootstrap>.ui-select-no-choice',
            )
            let lis: any = sc[2].querySelectorAll('li>div')
            lis[3].click()
            await sleep(1000)
            let scs: any = document.querySelectorAll('.modal-dialog .two-btn>.btn')
            scs[0].click()

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

      reqBody.value = await getSyncStorage('reqBody')
      outEncryptValue.value = await getSyncStorage('outEncryptValue')
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
