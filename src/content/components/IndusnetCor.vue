<template>
  <main id="kk-container">
    <div style="display: flex; align-items: center; width: 350px">
      <el-icon :size="24" color="#e6a23c"><QuestionFilled /></el-icon>
      <p style="font-size: 14px; display: inline-block">
        此网站不支持后台下载流水，登录成功后，在转帐界面，点击开关即可自动下载
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
  </main>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, reactive, toRefs, watch } from 'vue'
import { ElMessage, ElIcon } from 'element-plus'
import { QuestionFilled } from '@element-plus/icons-vue'
import useStorage from '../useStorage'
import { sleep, Timer } from '../../utils/index'

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
    const step = ref('customer')

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
        console.log('newValue: ', newValue);
        setSyncStorage({ onOff: props.onOff })
        clearTimeout(timer)
        clearTimeout(timer2)
        clearTimeout(timer3)
        clearInterval(cutDownNumTimer)
        if (newValue) {
          checkNavPage()
        }
      },
    )

    const checkNavPage = async () => {
      let flag: any = false

      let step: any = (await getSyncStorage('step')) || 'customer'

      // 当前在下载页面
      let accountDom: any = document.querySelector(
        'select[name="ctl00$ContentPlaceHolder1$ddlcustomerid"]',
      )
      if (accountDom) {
        let sel_fldacctno_ops: any = document.querySelectorAll(
          'select[name="ctl00$ContentPlaceHolder1$ddlcustomerid"] option',
        )
        let lastVal = sel_fldacctno_ops[sel_fldacctno_ops.length - 1]['value']

        // 选择帐号
        if (accountDom.value == 0) {
          setSyncStorage({ step: 'customer' })
          accountDom.value = lastVal
          accountDom.dispatchEvent(new Event('change'))
        }

        let accountDom2: any = document.querySelector(
          'select[name="ctl00$ContentPlaceHolder1$ddlaccountlist"]',
        )
        if (accountDom2) {
          let sel_fldacctno_ops2: any = document.querySelectorAll(
            'select[name="ctl00$ContentPlaceHolder1$ddlaccountlist"] option',
          )
          let lastVal2 = sel_fldacctno_ops2[sel_fldacctno_ops2.length - 1]['value']

          // 选择帐号
          if (accountDom2.value == 0) {
            setSyncStorage({ step: 'accountNumber' })
            accountDom2.value = lastVal2
            accountDom2.dispatchEvent(new Event('change'))
          }else{
            setSyncStorage({ step: 'accountNumber' })
          }

          if (step === 'accountNumber') {
            let viewDom: any = document.querySelector(
              'input[name="ctl00$ContentPlaceHolder1$btnview"]',
            )
            setSyncStorage({ step: 'view' })
            viewDom.click()
          } else if (step === 'view') {
            console.log('step: view');
            let exportDom: any = document.querySelector(
              'input[name="ctl00$ContentPlaceHolder1$btnExportGrid"]',
            )
            if (exportDom) {
              exportDom.click()
            } else {
              setSyncStorage({ step: 'customer' })
              // 重置
              clearTimeout(timer)
              clearInterval(cutDownNumTimer)
              cutDownNum.value = ruleForm.intervalTime
              timer = setTimeout(() => {
                checkNavPage()
              }, ruleForm.intervalTime * 1000 || 20000)
              cutDownNumTimer = setInterval(() => {
                cutDownNum.value--
                if (cutDownNum.value < 0) {
                  clearInterval(cutDownNumTimer)
                }
              }, 1000)
            }
          }else if(step === 'customer'){
            checkNavPage()
          } else {
            console.log('else');
            // let viewDom: any = document.querySelector(
            //   'input[name="ctl00$ContentPlaceHolder1$btnview"]',
            // )
            // setSyncStorage({ step: 'norecord' })
            // viewDom.click()
          }
        }
      } else {
        ctx.emit('onOffHandle', false)
        ElMessage({
          message: '[启动失败]：先登录再操作.',
          type: 'error',
        })
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
      ctx.emit('onOffHandle', onOff)
      ruleForm.intervalTime = _intervalTime || 30
      ruleForm.reportUrl = _reportUrl || ''
      cutDownNum.value = ruleForm.intervalTime

      // if (onOff) {
      //   console.log('onOff: ', onOff)
      //   let flag = checkNavPage()
      // }
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
