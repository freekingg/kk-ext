<template>
  <main id="kk-container">
    <div style="display: flex; align-items: center; width: 350px">
      <p style="font-size: 14px; display: inline-block">
        1、流水界面,打开插件开关，此时会自动下载 <br />
        2、插件会自动按开关的金额区间依次进行下载 <br />
        3、全流水：可以只打开一个区间，金额从最小到最大 <br />
        <p style="color: blue;font-weight: bolder;">注意：金额区间模式下载的文件中没有余额，全流水模式的文件中带有余额，如果想要下载带余额的文件 ，可以用一个独立的pnb子账号开启全流水下载</p>

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
        <el-form-item label="账户下标" prop="intervalTime">
          <el-input type="number" v-model="ruleForm.index" />
        </el-form-item>
        <el-form-item label="下载模式">
          <el-radio-group v-model="ruleForm.downloadAll">
            <el-radio :label="1">金额区间模式</el-radio>
            <el-radio :label="2">全流水模式</el-radio>
          </el-radio-group>
        </el-form-item>

        <template v-if="ruleForm.downloadAll === 1">
          <el-form-item
          label="金额范围"
          prop="reportUrl"
          v-for="(item, index) in limits"
          :key="index"
        >
          <el-input v-model="item.min" style="width: 100px" /> -
          <el-input v-model="item.max" style="width: 100px; margin-left: 4px; margin-right: 4px" />
          <el-switch
            v-model="item.onOff"
            active-color="#13ce66"
            inactive-color="#ff4949">
          </el-switch>
        </el-form-item>
        </template>
       
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
import { ElMessage, ElIcon, formContextKey } from 'element-plus'
import { QuestionFilled } from '@element-plus/icons-vue'
import useStorage from '../../useStorage'
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

    const pageType = ref('')

    const ruleForm: any = reactive({
      intervalTime: 20, //爬取间隔时间
      reportUrl: '', //上报接口地址
      name: 'Hello',
      data: {},
      index: 1,
      accNumber: '', //accNumber
      downloadAll:1
    })

    const limits: any = ref([
      { min: 100, max: 200, onOff: true },
      { min: 201, max: 600, onOff: false },
      { min: 601, max: 1000, onOff: false },
      { min: 1001, max: 1500, onOff: false },
      { min: 1501, max: 2500, onOff: false },
      { min: 2501, max: 4000, onOff: false },
      { min: 4001, max: 6000, onOff: false },
      { min: 6001, max: 8000, onOff: false },
      { min: 8001, max: 10000, onOff: false },
      { min: 10001, max: 25000, onOff: false },
      { min: 25001, max: 50000, onOff: false },
      { min: 50001, max: 100000, onOff: false },
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

    const research = async () => {
      if (!props.onOff) return
      let account: any = document.querySelector(
        'select[name="TransactionHistoryFG.INITIATOR_ACCOUNT"]',
      )
      let accountOptions: any = account.querySelectorAll('option')
      account.value = accountOptions[+ruleForm.index - 1]['value']

      setTimeout(async () => {
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
        let tomount: any = document.querySelector('input[name="TransactionHistoryFG.TO_AMOUNT"]')


        if(ruleForm.downloadAll === 2){
          fromamount.value = ''
          tomount.value = ''
          setSyncStorage({ step: 0 })
          let searchBtn: any = document.querySelector('#SEARCH')
          setTimeout(() => {
            searchBtn.click()
          }, 6000)
          return
        }


       
        let _step: number = (await getSyncStorage('step')) || 0
        console.log('research_step: ', _step)
        let keyong = limits.value.filter((item: any) => item.min && item.max && item.onOff)
        fromamount.value = keyong[_step] ? keyong[_step]['min'] : keyong[keyong.length - 1]['min']
        tomount.value = keyong[_step] ? keyong[_step]['max'] : keyong[keyong.length - 1]['max']
        console.log('当前下载.....', _step, fromamount.value, tomount.value)
        let searchBtn: any = document.querySelector('#SEARCH')
        setTimeout(() => {
          searchBtn.click()
        }, 6000)
      }, 5000)
    }

    const download = async () => {
      if (!props.onOff) return
      if (!watchBillPage()) {
        return
      }

      // checkDownTimer =  setInterval(()=>{
      let dwt: any = document.getElementById('TransactionHistoryFG.OUTFORMAT')
      let errorlink1: any = document.getElementById('errorlink1')

      // 有下载按钮和查询结果
      if (dwt || errorlink1) {
        clearInterval(checkDownTimer)
        // csv=3

        let _step: number = (await getSyncStorage('step')) || 0

        let cur = +_step
        if (errorlink1) {
          console.log('errorlink1: ', errorlink1)
          cur = +_step
        } else {
          cur = +_step + 1
        }
        let keyong = limits.value.filter((item: any) => item.min && item.max && item.onOff)
        console.log('cur', cur)
        if (dwt) {
          dwt.value = 3
          let okButton: any = document.querySelector(
            'form[name="TransactionHistoryFG"] .HW_formbtn #okButton',
          )


          if(ruleForm.downloadAll === 2){
            setSyncStorage({ step: 0 })
            setTimeout(() => {
              // 重置
              clearTimeout(timer)
              clearInterval(cutDownNumTimer)
              cutDownNum.value = ruleForm.intervalTime
              okButton.click()
              timer = setTimeout(() => {
                research()
              }, ruleForm.intervalTime * 1000 || 20000)
              cutDownNumTimer = setInterval(() => {
                cutDownNum.value--
                if (cutDownNum.value < 0) {
                  clearInterval(cutDownNumTimer)
                }
              }, 1000)
            }, 5000)
            return
          }

          if (_step > keyong.length) {
            console.log(_step, '===', keyong.length)

            setSyncStorage({ step: 0 })
            setTimeout(() => {
              // 重置
              clearTimeout(timer)
              clearInterval(cutDownNumTimer)
              cutDownNum.value = ruleForm.intervalTime
              timer = setTimeout(() => {
                // download()

                let searchBtn: any = document.querySelector('#SEARCH')
                research()
              }, ruleForm.intervalTime * 1000 || 20000)
              cutDownNumTimer = setInterval(() => {
                cutDownNum.value--
                if (cutDownNum.value < 0) {
                  clearInterval(cutDownNumTimer)
                }
              }, 1000)
            }, 5000)
            return
          } else {
            okButton.click()
            setTimeout(() => {
              research()
            }, 6000)
            setSyncStorage({ step: cur })
          }

          return
        }

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
          let _step: number = (await getSyncStorage('step')) || 0
          fromamount.value = keyong[_step]['min']
          let tomount: any = document.querySelector('input[name="TransactionHistoryFG.TO_AMOUNT"]')
          tomount.value = keyong[_step]['max']
          console.log('当前下载2.', _step, keyong[_step]['min'], keyong[_step]['max'])

          let searchBtn: any = document.querySelector('#SEARCH')
          setSyncStorage({ step: cur })
          setTimeout(() => {
            searchBtn.click()
          }, 3000)
        }
      } else {
        console.log('第一次')
        research()
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
      // chrome.storage.sync.clear()
      let PgHeading = document.getElementById('PgHeading.Ra1.C2')
      if(PgHeading?.innerText === 'View Mini Statement'){
        pageType.value = 'Mini'
      }else{
        pageType.value = 'Transactions'
      }

      let _downloadAll: number = await getSyncStorage('downloadAll')
      let _intervalTime: number = await getSyncStorage('intervalTime')
      let _index: number = await getSyncStorage('index')

      let _reportUrl: any = await getSyncStorage('reportUrl')
      let onOff: any = (await getSyncStorage('onOff')) || false
      if (onOff) {
        ctx.emit('onOffHandle', onOff)
      }

      let _limits: number = await getSyncStorage('limits')
      limits.value = _limits || [
        { min: 100, max: 200, onOff: true },
        { min: 201, max: 600, onOff: false },
        { min: 601, max: 1000, onOff: false },
        { min: 1001, max: 1500, onOff: false },
        { min: 1501, max: 2500, onOff: false },
        { min: 2501, max: 4000, onOff: false },
        { min: 4001, max: 6000, onOff: false },
        { min: 6001, max: 8000, onOff: false },
        { min: 8001, max: 10000, onOff: false },
        { min: 10001, max: 25000, onOff: false },
        { min: 25001, max: 50000, onOff: false },
        { min: 50001, max: 100000, onOff: false },
      ]
      console.log(limits.value)
      let keyong = limits.value.filter((item: any) => item.min && item.max && item.onOff)
      console.log('keyong: ', keyong.length)

      ruleForm.downloadAll = _downloadAll || 1
      ruleForm.intervalTime = _intervalTime || 20
      ruleForm.reportUrl = _reportUrl || ''
      ruleForm.index = _index || 1
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
#kk-container{
  max-height: 72vh;
  overflow: auto;
}
#kk-container :deep() .el-result {
  padding-top: 0;
  padding-bottom: 5px;
}
#kk-container :deep() .el-result__title {
  margin-top: 10px;
}
#kk-container :deep() .el-result__extra {
  margin-top: 10px;
}
.demo-ruleForm{
  padding-right: 8px;
}
</style>
