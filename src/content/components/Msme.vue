<template>
  <main id="kk-container">
    <div style="display: flex; align-items: center; width: 350px; font-size: 14px; flex-wrap: wrap">
      <span>此网站支持不后台下载流水 </span>
      <el-icon :size="24" color="#e6a23c"><QuestionFilled /></el-icon>
      <a
        target="_blank"
        style="color: #67c23a; text-decoration: underline; font-size: 16px"
        href="https://docs.google.com/document/d/17zOaWu8lBgxv7WGFYeeJMof0j8IOKES-gNk0bskGtdQ/edit#heading=h.7vy77bivzbd0"
        >使用文档</a
      >
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
        <el-form-item label="超时时间(s)" prop="maxtime">
          <el-input type="number" v-model="ruleForm.maxtime" />
        </el-form-item>
        <!-- <el-form-item label="请求参数">
          <el-input v-model="data" type="textarea" disabled />
        </el-form-item> -->
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
import { sleep, Timer, eventClick } from '../../utils/index'
let timer: any = null
let cutDownNumTimer: any = null
let checkDownloadFileTimer: any = null
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

    const ruleForm = reactive({
      intervalTime: 20, //爬取间隔时间
      maxtime: 120,
      reportUrl: '', //上报接口地址
      name: 'Hello',
      data: {},
      accNumber: '', //accNumber
    })
    const rules = reactive({
      intervalTime: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
      maxtime: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
      desc: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
    })

    watch(
      () => props.onOff,
      async (newValue) => {
        console.log('newValue: ', newValue)
        clearTimeout(timer)
        clearInterval(cutDownNumTimer)
        if (newValue) {
          setSyncStorage({ onOff: newValue })

          let accountstatement_csvAcctStmt = document.querySelector('#accountStatementForm1')
          if (accountstatement_csvAcctStmt) {
            ElMessage({
              message: '[任务开始执行].',
              type: 'success',
            })
            download()
            return
          } else {
            ElMessage({
              message: '[启动失败]：请确认是否在指定的流水界面',
              type: 'error',
            })
            ctx.emit('onOffHandle', false)
            return
          }
        } else if (!newValue) {
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

    const download = async () => {
      if (!props.onOff) return

      let accountStatementForm1 = document.querySelector('#accountStatementForm1')
      if (accountStatementForm1) {
        let transferSeqTrs: any = document.querySelectorAll('.transferSeq table tr')
        if(!transferSeqTrs[2].querySelector('label input').checked){
          transferSeqTrs[2].querySelector('label').click()
        }
        await sleep(1000)

        // next按钮
        let nextBtn: any = document.querySelector('#downBtn')
        nextBtn.click()

        let result = checkWrong()
        if (!result) {
          sleep(10000).then(() => {
            checkWrong()
          })
        }

        // 监控有没有跳转到下载按钮页面
        let count = 0
        checkDownloadFileTimer = setInterval(async () => {
          count++
          // console.log('MSME助手: 监控有没有跳转到下载按钮页面', count)
          let gotoDownloadfile: any = document.querySelector(
            `#downBtn[ng-click="gotoDownloadfile('excel')"]`,
          )
          if (gotoDownloadfile) {
            clearInterval(checkDownloadFileTimer)
            gotoDownloadfile.click()
            await sleep(1000)
            let backBtn: any = document.querySelector(`.btn[ng-click="goToNext(accountStatement)"]`)
            backBtn.click()

            // 上一轮执行完，继续抓取
            console.log(`MSME助手: 上一轮执行完,等待${ruleForm.intervalTime}继续执行`)
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
          } else {
            let diffCount = ruleForm.maxtime || 120
            if (count > diffCount) {
              ElMessage({
                message: `超过最大等待时间${diffCount}，继续执行下一轮`,
                type: 'success',
              })
              clearInterval(checkDownloadFileTimer)
              console.log(`超过最大等待时间${diffCount}，继续执行下一轮`)
              download()
            }
          }
        }, 1000)
      }
    }

    // 检查 错误弹窗
    const checkWrong = () => {
      let modalSm: any = document.querySelectorAll('.modal-sm')
      if (modalSm.length > 1) {
        console.log('MSME助手: 发现异常，请检查。页面弹出了错误弹窗。')
        try {
          modalSm[0].querySelector('button').click()
        } catch (error) {
          console.log('error: ', error)
        }
        return true
      }
      return false
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
      let _maxTime: number = await getSyncStorage('maxtime')
      let _reportUrl: any = await getSyncStorage('reportUrl')
      let onOff: any = (await getSyncStorage('onOff')) || false
      if (onOff) {
        ctx.emit('onOffHandle', onOff)
      }
      ruleForm.intervalTime = _intervalTime || 20
      ruleForm.maxtime = _maxTime || 120
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
