<template>
  <main id="kk-container">
    <div style="display: flex; align-items: center; width: 350px">
      <el-icon :size="24" color="#e6a23c" @click="helpHandle"><QuestionFilled /></el-icon>
      <p style="font-size: 14px; display: inline-block; margin: 0">
        此网站支持不后台下载流水，需要停留在流水界面(Enquire>A/c Statement ),直接点开始即可
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
let checkDownBtnTimer: any = null
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
    const runGifSrc = ref(chrome.runtime.getURL('img/runing2.gif'))
    const state = reactive({
      currentTab: null,
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
        clearInterval(checkDownBtnTimer)
        if (newValue) {
          setSyncStorage({ onOff: newValue })

          // downloadForApi()
          // return

          let accountStatementForm1 =
            document.querySelector('frame[name="main_part"]') &&
            (
              document.querySelector('frame[name="main_part"]') as any
            ).contentWindow.document.querySelector('select[name="selAccttype"]')

          // 如果有下载按钮，
          if (accountStatementForm1) {
            ElMessage({
              message: '[任务执行成功].',
              type: 'success',
            })
            download()
            return
          } else {
            ElMessage({
              message: '[请确认已经登录,并且在流水界面].',
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

      let accountStatementForm1 =
        document.querySelector('frame[name="main_part"]') &&
        (
          document.querySelector('frame[name="main_part"]') as any
        ).contentWindow.document.querySelector('select[name="selAccttype"]')
      if (!accountStatementForm1) {
        setSyncStorage({ onOff: false })
        ctx.emit('onOffHandle', false)
        return
      }

      await sleep(1500)

      // 选择账号类型
      let selAccttype =
        document.querySelector('frame[name="main_part"]') &&
        (
          document.querySelector('frame[name="main_part"]') as any
        ).contentWindow.document.querySelector('select[name="selAccttype"]')
      if (selAccttype) {
        selAccttype.value = 'SCA'
        selAccttype.dispatchEvent(new Event('change'))
      }

      // 选择账号
      let selAcct = (
        document.querySelector('frame[name="main_part"]') as any
      ).contentWindow.document.querySelector('select[name="selAcct"]')
      if (selAcct) {
        let options = selAcct.querySelectorAll('option')
        console.log('options: ', options)
        selAcct.value = options[1]['value']
        selAcct.dispatchEvent(new Event('change'))
        await sleep(1000)
      }

      let radTxnType = (
        document.querySelector('frame[name="main_part"]') as any
      ).contentWindow.document.querySelectorAll('input[name="radTxnType"]')
      if (radTxnType) {
        radTxnType[1].click()
        await sleep(1000)
        // selAcct.dispatchEvent(new Event('click'))
      }

      var myDate = new Date()
      function add(n: any) {
        if (n <= 9) {
          return `0${n}`
        }
        return n
      }
      var myYear = myDate.getFullYear() //获取完整的年份(4位,1970-????)
      var myMonth = add(myDate.getMonth() + 1) //获取当前月份(0-11,0代表1月)
      var myToday = add(myDate.getDate()) //获取当前日(1-31)
      let today = `${myToday}/${myMonth}/${myYear}`
      let frmDatePicker = (
        document.querySelector('frame[name="main_part"]') as any
      ).contentWindow.document.querySelector('input#frmDatePicker')
      if (frmDatePicker) {
        frmDatePicker.value = today
        await sleep(1000)
      }
      let toDatePicker = (
        document.querySelector('frame[name="main_part"]') as any
      ).contentWindow.document.querySelector('input#toDatePicker')
      if (toDatePicker) {
        toDatePicker.value = today
        await sleep(1000)
      }
      let viewBtn = (
        document.querySelector('frame[name="main_part"]') as any
      ).contentWindow.document.querySelector('a.viewBtn')
      if (viewBtn) {
        viewBtn.click()
        await sleep(1000)
      }

      // 检查下载按钮是否出现
      checkDownBtnTimer = setInterval(async () => {
        let download_stmt = (
          document.querySelector('frame[name="main_part"]') as any
        ).contentWindow.document.querySelector('a[onclick="return download_stmt();"]')
        if (download_stmt) {
          clearInterval(checkDownBtnTimer)
          let fldFormatType = (
            document.querySelector('frame[name="main_part"]') as any
          ).contentWindow.document.querySelector('select[name="fldFormatType"]')
          if (fldFormatType) {
            fldFormatType.value = 'X'
            fldFormatType.dispatchEvent(new Event('change'))
            await sleep(1000)
          }
          download_stmt.click()
          await sleep(1000)
          let customSubmit = (
            document.querySelector('frame[name="main_part"]') as any
          ).contentWindow.document.querySelector('a[onclick="return customSubmit()"]')
          customSubmit.click()
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
      }, 1000)
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
      ruleForm.intervalTime = _intervalTime || 20
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
