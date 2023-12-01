<template>
  <main id="kk-container">
    <div style="display: flex; align-items: center; width: 350px">
      <el-alert title="操作说明" type="info">
        <p>此网站不支持接口下载</p>
        <p style="color: red;">在Account Statement流水界面点击开始即可自动下载</p>
      </el-alert>
    </div>
    <section class="run-status">
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
        <el-form-item>
          <el-button type="primary" @click="submitForm(ruleFormRef)">保存</el-button>
        </el-form-item>
      </el-form>
    </section>

    <el-dialog v-model="dialogHelpVisible" title="Tips" width="30%">
      <div>
        <strong>使用方法</strong>
        <ul style="padding: 0 20px">
          <li>1、在Accounts标签下，点击开关即可开始自动下载流水操作</li>
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
import { sleep, Timer, eventClick } from '../../utils/index'
import useStorage from '../useStorage'
let timer: any = null
let timer2: any = null
let timer3: any = null
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
        setSyncStorage({ onOff: props.onOff })
        clearTimeout(timer)
        clearTimeout(timer2)
        clearTimeout(timer3)
        clearInterval(cutDownNumTimer)
        if (newValue) {
          setSyncStorage({ step: 0 })
          let flag = checkNavPage()
          // console.log('flag: ', flag);
          if (newValue) {
            // ElMessage({
            //   message: '.',
            //   type: 'error',
            // })
            console.log(2)
          } else {
            ElMessage({
              message: '[启动失败]：先登录再操作.',
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

    const resetHandle = () => {
      console.log(props.onOff);
      if (!props.onOff) return
      // 重置
      clearTimeout(timer)
      clearInterval(cutDownNumTimer)
      cutDownNum.value = ruleForm.intervalTime
      setSyncStorage({ step: 0 })
      timer = setTimeout(() => {
        let ActionGo: any = document.querySelector('input[name="Action.Go"]')
        console.log('ActionGo: ', ActionGo)
        if (ActionGo) {
          ActionGo.click()
        }
      }, ruleForm.intervalTime * 1000 || 20000)
      cutDownNumTimer = setInterval(() => {
        cutDownNum.value--
        if (cutDownNum.value < 0) {
          clearInterval(cutDownNumTimer)
        }
      }, 1000)
    }

    const checkNavPage = async () => {
      let flag: any = false

      let txnSrcLatestNoOfTxns: any = document.querySelector('input[name="txnSrcLatestNoOfTxns"]')
      let ExcelFormat: any = document.querySelector(
        'input[name="Action.Accounts.SaveAs.ExcelFormat"]',
      )
      // if (!txnSrcLatestNoOfTxns || !ExcelFormat) {
      //   ElMessage({
      //     message: '[启动失败]：先登录再操作.',
      //     type: 'error',
      //   })
      // }

      // 当前在下载页面
      if (ExcelFormat) {
        console.log('当前在下载页面')
        ExcelFormat.click()
        await sleep(5000)
        setSyncStorage({ step: 0 })
        // 等待重置
        resetHandle()
        return
      }

      let shijianinput: any = document.querySelector('input[name="txnSrcFromDate"]')
      // 当前在时间选择界面
      if (shijianinput) {
        // 当前在时间选择界面
        let shijianinput2: any = document.querySelector('input[name="txnSrcToDate"]')

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
        let today1 = `01/${myToday}/${myYear}`
        let today = `${myMonth}/${myToday}/${myYear}`
        shijianinput.value = today
        shijianinput2.value = today
        await sleep(500)

        let txnSrchSortOrder: any = document.querySelectorAll('input[name="txnSrchSortOrder"]')
        txnSrchSortOrder[1].click()
        txnSrchSortOrder[1].checked = true
        await sleep(500)

        // 选择下载格式
        let xiazaigeshi: any = document.querySelector('input[value="4"]')
        xiazaigeshi.click()
        xiazaigeshi.checked = true

        let QueryStatement: any = document.querySelector(
          'input[name="Action.Accounts.QuerySelection.QueryStatement"]',
        )
        let _step: number = (await getSyncStorage('step')) || 0
        if (_step >= 2) {
          // 等待重置
          resetHandle()
          return
        }
        setSyncStorage({ step: _step + 1 })
        await sleep(500)
        if (QueryStatement) {
          QueryStatement.click()
        }
      }
      return flag
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
      let onOff: any = (await getSyncStorage('onOff')) || false
      let step: any = (await getSyncStorage('step')) || 0
      ctx.emit('onOffHandle', onOff)
      ruleForm.intervalTime = _intervalTime || 30
      ruleForm.reportUrl = _reportUrl || ''
      cutDownNum.value = ruleForm.intervalTime

      if (onOff) {
        let flag = checkNavPage()
        console.log('flag: ', flag)
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
