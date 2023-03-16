<template>
  <main id="kk-container">
    <div style="display: flex; align-items: center; width: 350px">
      <p style="font-size: 14px; display: inline-block">
        -、此网站需要打开流水界面进行下载 <br />
        1、流水界面,打开插件开关，此时会自动下载 <br />
        2、插件会自动按金额区间依次进行下载 <br />
        3、全流水下载：清空所有金额，只留第一个1-100000 <br />
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

        <el-form-item
          label="金额范围"
          prop="reportUrl"
          v-for="(item, index) in limits"
          :key="index"
        >
          <el-input v-model="item.min" style="width: 100px" /> -
          <el-input v-model="item.max" style="width: 100px; margin-left: 4px" />
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
          <li>1、进入流水界面，然后点击开始</li>
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
import { defineComponent, ref, onMounted, reactive, toRefs, watch, toRaw } from 'vue'
import { ElMessage, ElIcon } from 'element-plus'
import { QuestionFilled } from '@element-plus/icons-vue'
import useStorage from '../useStorage'
let timer: any = null
let cutDownNumTimer: any = null
let checkDownTimer: any = null

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

    const ruleForm: any = reactive({
      intervalTime: 20, //爬取间隔时间
      reportUrl: '', //上报接口地址
      name: 'Hello',
      data: {},
      accNumber: '', //accNumber
    })

    const limits: any = ref([
      { min: 100, max: 300 },
      { min: 301, max: 700 },
      { min: 701, max: 1500 },
      { min: 1501, max: 3000 },
      { min: 3001, max: 10000 },
      { min: 10001, max: 50000 },
      { min: 50001, max: 100000 },
    ])

    const rules = reactive({
      intervalTime: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
      desc: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
    })

    watch(
      () => props.onOff,
      (newValue) => {
        clearTimeout(timer)
        clearInterval(cutDownNumTimer)
        clearInterval(checkDownTimer)
        setSyncStorage({ onOff: newValue })

        if (newValue) {
          if (!watchBillPage()) {
            ElMessage({
              message: '[启动失败]：请在流水界面执行开始.',
              type: 'error',
            })
            ctx.emit('onOffHandle', false)
            setSyncStorage({ onOff: false })
          } else {
            // ElMessage({
            //   message: '[任务执行成功].',
            //   type: 'success',
            // })
            // setSyncStorage({ step: 0 })
            download()
          }
        } else if (!newValue) {
          setSyncStorage({ onOff: false })
          ctx.emit('onOffHandle', false)
          ElMessage({
            message: '[任务已经关闭].',
            type: 'info',
          })
        } else {
          setSyncStorage({ onOff: false })
          ElMessage({
            message: '[启动失败]：请在流水界面执行开始.',
            type: 'error',
          })
          ctx.emit('onOffHandle', false)
        }
      },
    )

    // 检查流水页面
    const watchBillPage = () => {
      let PgHeadingRa1C2: any = document.querySelector('#PgHeading .pageheadingcaps')
      if (PgHeadingRa1C2 && PgHeadingRa1C2.innerText == 'My Transactions') {
        return true
      } else {
        return false
      }

      // let inputs = document.querySelectorAll('form[name="TransactionHistoryFG"] input')
      // let ra1 = document.querySelector('#dwnldDetailsCaption')
      // if (inputs.length && ra1) {
      //   return true
      // } else {
      //   return false
      // }
    }

    const submitForm = async (formEl: any) => {
      if (!formEl) return
      await formEl.validate((valid: any, fields: any) => {
        if (valid) {
          console.log('submit!')
          setSyncStorage({ step: 0 })
          setSyncStorage({ limits: toRaw(limits.value) })
          setSyncStorage(ruleForm)
        } else {
          console.log('error submit!', fields)
        }
      })
    }

    const download = async () => {
      if (!props.onOff) return
      if (!watchBillPage()) {
        return
      }

      // checkDownTimer =  setInterval(()=>{
      let dwt: any = document.getElementById('TransactionHistoryFG.OUTFORMAT')
      let errorlink1: any = document.getElementById('errorlink1')
      if (dwt || errorlink1) {
        clearInterval(checkDownTimer)
        // csv=3

        if (dwt) {
          dwt.value = 3
          let okButton: any = document.querySelector(
            'form[name="TransactionHistoryFG"] .HW_formbtn #okButton',
          )
          okButton.click()
        }

        let _step: number = await getSyncStorage('step')
        console.log('_step: ', _step)
        let cur = +_step + 1

        let keyong = limits.value.filter((item: any) => item.min && item.max)
        console.log('keyong: ', keyong.length);

        if (+_step >= keyong.length) {
          setSyncStorage({ step: 0 })

          setTimeout(() => {
            // 重置
            clearTimeout(timer)
            clearInterval(cutDownNumTimer)
            cutDownNum.value = ruleForm.intervalTime
            timer = setTimeout(() => {
              // download()

              let searchBtn: any = document.querySelector('#SEARCH')
              console.log('点击查询按钮')
              if (searchBtn) {
                searchBtn.click()
              }
            }, ruleForm.intervalTime * 1000 || 20000)
            cutDownNumTimer = setInterval(() => {
              cutDownNum.value--
              if (cutDownNum.value < 0) {
                clearInterval(cutDownNumTimer)
              }
            }, 1000)
          }, 5000)
        } else {
          let fromamount: any = document.querySelector(
            'input[name="TransactionHistoryFG.FROM_AMOUNT"]',
          )
          let _step: number = await getSyncStorage('step')
          fromamount.value = keyong[_step]['min']
          let tomount: any = document.querySelector('input[name="TransactionHistoryFG.TO_AMOUNT"]')
          tomount.value = keyong[_step]['max']
          console.log('当前下载.', _step, keyong[_step]['min'], keyong[_step]['max'])

          let searchBtn: any = document.querySelector('#SEARCH')
          setSyncStorage({ step: cur })
          setTimeout(() => {
            searchBtn.click()
          }, 3000)
        }
      } else {
        console.log('下载一个文件')
        let ra1: any = document.querySelectorAll(
          'input[name="TransactionHistoryFG.SELECTED_RADIO_INDEX"]',
        )
        if (ra1) {
          ra1[1].click()
        }

        let lastdaysel: any = document.querySelector(
          'select[name="TransactionHistoryFG.TXN_PERIOD"]',
        )
        lastdaysel.value = '01'

        let fromamount: any = document.querySelector(
          'input[name="TransactionHistoryFG.FROM_AMOUNT"]',
        )
        let _step: number = await getSyncStorage('step')
        console.log('_step: ', _step)
        let keyong = limits.value.filter((item: any) => item.min && item.max)
        fromamount.value = keyong[_step]['min']
        let tomount: any = document.querySelector('input[name="TransactionHistoryFG.TO_AMOUNT"]')
        tomount.value = keyong[_step]['max']
        console.log('当前下载..', _step,keyong[_step]['min'], keyong[_step]['max'])
        let searchBtn: any = document.querySelector('#SEARCH')
        setTimeout(() => {
          searchBtn.click()
        }, 3000)
      }
      // },1000)
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
      let onOff: any = (await getSyncStorage('onOff')) || false
      if (onOff) {
        ctx.emit('onOffHandle', onOff)
      }

      let _limits: number = await getSyncStorage('limits')
      limits.value = _limits || [
        { min: 100, max: 300 },
        { min: 301, max: 700 },
        { min: 701, max: 1500 },
        { min: 1501, max: 3000 },
        { min: 3001, max: 10000 },
        { min: 10001, max: 50000 },
        { min: 50001, max: 100000 },
      ]

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
      helpHandle,
      cutDownNum,
      submitForm,
      resetForm,
      dialogHelpVisible,
      limits,
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
