<template>
  <main id="kk-container">
    <div style="width: 350px">
      <p style="font-size: 14px; margin: 0; padding: 0">
        1、此网站可以 <span style="color: red">多开网页</span> ，
      </p>
      <p style="font-size: 14px; margin: 0; padding: 0; color: red">
        2、可以用多个网页在同时下流水，其中一个页面转账
      </p>
      <p style="font-size: 14px; margin: 0; padding: 0; color: red">
        3、在网页右键选择复制当前窗口
      </p>
      <p style="font-size: 14px; margin: 0; padding: 0; color: red">
        4、遇到异常时点击“重置”按钮或者刷新页面尝试(程序如果卡1分钟也会自动尝试重启运行)
      </p>
    </div>
    <section class="run-status">
      <!-- <img :src="runGifSrc"> -->
      <el-result icon="info" :title="onOff ? '运行中' + cutDownNum + 's' : '未启动'">
        <template #icon>
          <img :src="runGifSrc" v-if="onOff" style="width: 100px" />
        </template>
        <template #extra>
          <el-button type="primary" @click="settingVisibleHandle">配置</el-button>
          <el-button type="primary" @click="rest">重置</el-button>
        </template>
      </el-result>
    </section>
    <section v-if="settingVisible">
      <el-form
        ref="ruleFormRef"
        :model="currentTab.ruleForm"
        :rules="rules"
        label-width="120px"
        class="demo-ruleForm"
        status-icon
      >
        <el-form-item label="下载模式">
          <el-radio-group v-model="currentTab.ruleForm.downloadMode">
            <el-radio :label="1">全流水模式</el-radio>
            <el-radio :label="2">最近10笔</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="爬取间隔(s)" prop="intervalTime">
          <el-input type="number" v-model="currentTab.ruleForm.intervalTime" />
        </el-form-item>
        <el-form-item label="customer下标" prop="customerIndex">
          <el-input type="number" v-model="currentTab.ruleForm.customerIndex" />
        </el-form-item>
        <el-form-item label="account下标" prop="accountIndex">
          <el-input type="number" v-model="currentTab.ruleForm.accountIndex" />
        </el-form-item>
        <el-form-item label="下载类型" prop="downloadType">
          <el-input
            type="text"
            v-model="currentTab.ruleForm.downloadType"
            placeholder="E:excel, X:excel WithoutLog"
          />
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
    const runGifSrc = ref(chrome.runtime.getURL('img/runing2.gif'))
    const currentTab: any = reactive({
      ruleForm: {
        intervalTime: 20, //爬取间隔时间
        name: 'Hello',
        customerIndex: 1, //accNumber
        accountIndex: 1, //accNumber
        downloadType: 'E',
        downloadMode: 1,
      },
      step: 'customer',
      cutDownNum: 20,
    })

    const { setSyncStorage, getSyncStorage } = useStorage()

    const ruleFormRef = ref()
    const dialogHelpVisible = ref(false)

    const rules = reactive({
      intervalTime: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
      desc: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
    })

    const setStrrageHandle = () => {
      try {
        setSyncStorage({ ['currentTab' + currentTab.windowId]: currentTab })
      } catch (error) {
        console.log('error: ', error)
      }
    }

    const getStrrageHandle = () => {
      return getSyncStorage('currentTab' + currentTab.windowId)
    }

    watch(
      () => props.onOff,
      (newValue) => {
        currentTab.onOff = props.onOff
        setStrrageHandle()
        clearTimeout(timer)
        clearTimeout(timer2)
        clearTimeout(timer3)
        clearInterval(cutDownNumTimer)
        setStrrageHandle()
        if (newValue) {
          console.log('newValue: ', newValue)
          checkNavPage()
        }
      },
    )

    const rest = () => {
      ctx.emit('onOffHandle', false)
      currentTab.step = 'customer'
      currentTab.onOff = false
      setStrrageHandle()
      setTimeout(() => {
        location.reload()
      }, 800)
    }

    const checkNavPage = async () => {
      let flag: any = false
      let downloadMode: any = currentTab.ruleForm.downloadMode
      if (!currentTab.onOff) {
        ctx.emit('onOffHandle', false)
        currentTab.step = 'customer'
        currentTab.onOff = false
        setStrrageHandle()
        return
      }

      if (downloadMode === 1) {
        if (location.pathname.indexOf('THAccountStatement') === -1) {
          ElMessage({
            message: '[启动失败]：请在流水界面执行开始.',
            type: 'error',
          })
          ctx.emit('onOffHandle', false)
          return
        }

        let currentTabData: any = await getStrrageHandle()

        let step: any = currentTabData.step || 'customer'
        // 当前在下载页面
        let accountDom: any = document.querySelector(
          'select[name="ctl00$ContentPlaceHolder1$ddlcustomerid"]',
        )

        if (accountDom) {
          let sel_fldacctno_ops: any = document.querySelectorAll(
            'select[name="ctl00$ContentPlaceHolder1$ddlcustomerid"] option',
          )
          let lastVal = sel_fldacctno_ops[currentTab.ruleForm.accountIndex]['value']

          // 选择帐号
          if (accountDom.value == 0) {
            currentTab.step = 'customer'
            setStrrageHandle()
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
            let lastVal2 = sel_fldacctno_ops2[currentTab.ruleForm.accountIndex]['value']
            console.log('lastVal2: ', lastVal2)
            // 选择帐号
            if (accountDom2.value == 0) {
              if (lastVal2 == 0) {
                console.log('lastVal2: 要点取消要点取消要点取消要点取消')
                currentTab.step = 'customer'
                setStrrageHandle()
                await sleep(1000)
                let cannelBtn: any = document.querySelector(
                  'input[name="ctl00$ContentPlaceHolder1$btncancel"]',
                )
                cannelBtn.click()
                return
              }
              currentTab.step = 'accountNumber'
              setStrrageHandle()
              accountDom2.value = lastVal2
              accountDom2.dispatchEvent(new Event('change'))
            } else {
              currentTab.step = 'accountNumber'
              setStrrageHandle()
            }
            console.log('currentTab.step', currentTab.step)
            if (step === 'accountNumber') {
              let viewDom: any = document.querySelector(
                'input[name="ctl00$ContentPlaceHolder1$btnview"]',
              )
              let checkoutResTimer: any = null
              currentTab.step = 'view'
              setStrrageHandle()
              console.log('点查询')
              let nn = 0
              clearInterval(checkoutResTimer)
              checkoutResTimer = setInterval(async () => {
                nn += 1
                console.log('检查', nn)
                if (nn > 60) {
                  clearInterval(checkoutResTimer)
                  location.reload()
                }
              }, 1000)
              await sleep(1000)
              viewDom.click()
            } else if (step === 'view') {
              await sleep(1000)
              let exportDom: any = document.querySelector(
                'input[name="ctl00$ContentPlaceHolder1$btnExportGrid"]',
              )

              let downloadDom: any = document.querySelector(
                'input[name="ctl00$ContentPlaceHolder1$btndownload"]',
              )

              if (exportDom || downloadDom) {
                await sleep(1000)
                let downloadTypeVal = currentTab.ruleForm.downloadType || 'E'
                let XxlsDom: any = document.querySelector(`input[value="${downloadTypeVal}"]`)
                if (XxlsDom) {
                  XxlsDom.click()
                }

                // exportDom && exportDom.click()
                downloadDom && downloadDom.click()
                console.log('重置')
                currentTab.step = 'customer'
                setStrrageHandle()
                // chrome.runtime.sendMessage({ type: 'GET_TAB' }, async (tab) => {
                // console.log('tab: ', tab)
                // if (tab.status) {
                // 重置
                clearTimeout(timer)
                clearInterval(cutDownNumTimer)
                cutDownNum.value = currentTab.ruleForm.intervalTime
                timer = setTimeout(() => {
                  checkNavPage()
                }, currentTab.ruleForm.intervalTime * 1000 || 20000)
                cutDownNumTimer = setInterval(() => {
                  cutDownNum.value--
                  currentTab.cutDownNum = cutDownNum.value
                  setStrrageHandle()
                  if (cutDownNum.value < 0) {
                    currentTab.cutDownNum = currentTab.ruleForm.intervalTime
                    setStrrageHandle()
                    clearInterval(cutDownNumTimer)
                  }
                }, 1000)
                // }
                // })
              } else {
                currentTab.step = 'customer'
                setStrrageHandle()
                // 重置
                clearTimeout(timer)
                clearInterval(cutDownNumTimer)
                cutDownNum.value = currentTab.ruleForm.intervalTime
                timer = setTimeout(() => {
                  checkNavPage()
                }, currentTab.ruleForm.intervalTime * 1000 || 20000)
                cutDownNumTimer = setInterval(() => {
                  cutDownNum.value--
                  currentTab.cutDownNum = cutDownNum.value
                  setStrrageHandle()
                  if (cutDownNum.value < 0) {
                    currentTab.cutDownNum = currentTab.ruleForm.intervalTime
                    setStrrageHandle()
                    clearInterval(cutDownNumTimer)
                  }
                }, 1000)
              }
            } else if (step === 'customer') {
              checkNavPage()
            } else {
              console.log('else')
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
            message: '[启动失败]：请确认是否在流水界面.',
            type: 'error',
          })
        }
      }

      if (downloadMode === 2) {
        if (location.pathname.indexOf('mini-statement') === -1) {
          ElMessage({
            message: '[启动失败]：请在Mini Statement流水界面执行开始.',
            type: 'error',
          })
          ctx.emit('onOffHandle', false)
          return
        }
        let currentTabData: any = await getStrrageHandle()

        let sel_fldacctno: any = document.querySelector('select[formcontrolname="mappedAccount"]')
        let sel_fldacctno_ops: any = document.querySelectorAll(
          'select[formcontrolname="mappedAccount"] option',
        )

        let lastVal = sel_fldacctno_ops[currentTab.ruleForm.customerIndex]['value']
        sel_fldacctno.value = lastVal
        sel_fldacctno.dispatchEvent(new Event('change'))

        await sleep(2000)

        let sel_fldacctno2: any = document.querySelector('select[formcontrolname="accountNumber"]')
        let sel_fldacctno_ops2: any = document.querySelectorAll(
          'select[formcontrolname="accountNumber"] option',
        )
        let lastVal2 = sel_fldacctno_ops2[currentTab.ruleForm.accountIndex]['value']
        sel_fldacctno2.value = lastVal2
        sel_fldacctno2.dispatchEvent(new Event('change'))

        let checkoutResTimer: any = null
        checkoutResTimer = setInterval(async () => {
          let overlay: any = document.querySelector('.overlay[hidden]')
          if (overlay) {
            clearInterval(checkoutResTimer)

            let types: any = document.querySelector('input[value="excel"]')
            types.click()
            await sleep(500)
            let btn: any = document.querySelector('button.btn.btn-warning.btn-sm')
            btn.click()
            // 重置
            clearTimeout(timer)
            clearInterval(cutDownNumTimer)
            cutDownNum.value = currentTab.ruleForm.intervalTime
            timer = setTimeout(() => {
              checkNavPage()
            }, currentTab.ruleForm.intervalTime * 1000 || 20000)
            cutDownNumTimer = setInterval(() => {
              cutDownNum.value--
              currentTab.cutDownNum = cutDownNum.value
              setStrrageHandle()
              if (cutDownNum.value < 0) {
                currentTab.cutDownNum = currentTab.ruleForm.intervalTime
                setStrrageHandle()
                clearInterval(cutDownNumTimer)
              }
            }, 1000)
          }
        }, 1000)
      }

      return flag
    }

    const submitForm = async (formEl: any) => {
      if (!formEl) return
      await formEl.validate((valid: any, fields: any) => {
        if (valid) {
          setSyncStorage({ ['currentTab' + currentTab.windowId]: currentTab })
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
      chrome.runtime.sendMessage({ type: 'GET_TAB' }, async (tab) => {
        if (tab) {
          currentTab.windowId = tab.id
        } else {
          currentTab.windowId = 1
        }

        let defaultEuleForm: any = {
          intervalTime: 20, //爬取间隔时间
          name: 'Hello',
          customerIndex: 1, //accNumber
          accountIndex: 1, //accNumber
          downloadType: 'E',
          downloadMode: 1,
        }
        let _currentTab: any = (await getSyncStorage('currentTab' + currentTab.windowId)) || {
          ruleForm: defaultEuleForm,
          cutDownNum: 20,
          onOff: false,
          step: 'customer',
        }
        let _cutDownNum: number = _currentTab.cutDownNum
        let _intervalTime: number = _currentTab.ruleForm.intervalTime
        let _customerIndex: any = _currentTab.ruleForm.customerIndex
        let _accountIndex: any = _currentTab.ruleForm.accountIndex
        let _downloadType: any = _currentTab.ruleForm.downloadType
        let _downloadMode: any = _currentTab.ruleForm.downloadMode || 1
        let _step: any = _currentTab.step
        let onOff: any = _currentTab.onOff

        currentTab.ruleForm.intervalTime = _intervalTime
        currentTab.ruleForm.customerIndex = _customerIndex
        currentTab.ruleForm.accountIndex = _accountIndex
        currentTab.ruleForm.downloadType = _downloadType
        currentTab.ruleForm.downloadMode = _downloadMode
        cutDownNum.value = _cutDownNum
        currentTab.step = _step

        if (
          location.pathname.indexOf('THAccountStatement') !== -1 ||
          location.pathname.indexOf('mini-statement') !== -1
        ) {
          setTimeout(() => {
            ctx.emit('onOffHandle', onOff)
          }, 1000)
        } else {
          setTimeout(() => {
            ctx.emit('onOffHandle', false)
            currentTab.onOff = false
            currentTab.step = 'customer'
            setStrrageHandle()
          }, 1000)
        }
      })
    })
    return {
      settingVisible,
      settingVisibleHandle,
      runGifSrc,
      ruleFormRef,
      currentTab,
      rest,
      rules,
      cutDownNum,
      submitForm,
      resetForm,
      helpHandle,
      dialogHelpVisible,
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
