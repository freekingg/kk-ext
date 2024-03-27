<template>
  <main id="kk-container">
    <div style="display: flex; align-items: center; width: 350px; font-size: 14px; flex-wrap: wrap">
      <el-alert title="操作说明" type="info">
        <p>此网站不支持接口下载</p>
        <p>在流水界面点开关即可开始下载</p>
      </el-alert>
    </div>
    <section class="run-status">
      <!-- <img :src="runGifSrc"> -->
      <el-result icon="info" :title="onOff ? '运行中' + cutDownNum + 's' : '未启动'">
        <template #icon>
          <img :src="runGifSrc" v-if="onOff" />
          <h4 v-if="onOff">实时余额: {{ accBalance }}</h4>
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
        <el-form-item label="下载模式">
          <el-radio-group v-model="ruleForm.downloadMode">
            <el-radio :label="1">全流水模式</el-radio>
            <el-radio :label="2">最近10笔</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="submitForm(ruleFormRef)">保存</el-button>
        </el-form-item>
      </el-form>
    </section>
    <div class="btn-area" style="display: flex; justify-content: center; margin-bottom: 10px">
      <!-- <el-button type="primary" @click="startHandle">下载流水</el-button> -->
      <!-- <el-button type="primary" @click="transForPageHandle">转账</el-button> -->
    </div>
  </main>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, reactive, toRefs, watch } from 'vue'
import { ElMessage, ElIcon } from 'element-plus'
import { QuestionFilled } from '@element-plus/icons-vue'
import useStorage from '../useStorage'
import { writeFileXLSX, utils } from 'xlsx'
import { sleep, Timer, eventClick } from '../../utils/index'
let timer: any = null
let cutDownNumTimer: any = null
let checkDownTimer: any = null
let checkLiushuiPage: any = null
let checkoutBlockOverlayTimer: any = null
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

    const accBalance = ref('-')

    const ruleForm = reactive({
      intervalTime: 20, //爬取间隔时间
      reportUrl: '', //上报接口地址
      name: 'Hello',
      downloadMode: 1,
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
        clearTimeout(timer)
        clearInterval(cutDownNumTimer)
        clearInterval(checkDownTimer)
        clearInterval(checkLiushuiPage)
        clearInterval(checkoutBlockOverlayTimer)
        setSyncStorage({ mode: 'download' })
        if (newValue) {
          setSyncStorage({ onOff: newValue })

          if (!watchBillPage()) {
            ElMessage({
              message: '[启动失败]：请在流水界面执行开始.',
              type: 'error',
            })
            ctx.emit('onOffHandle', false)
            setSyncStorage({ onOff: false })
          } else {
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
      let pathname = 'accountstatement'
      console.log(ruleForm.downloadMode)
      if (ruleForm.downloadMode == 2) {
        if (
          location.pathname.indexOf('accountsummary') !== -1 ||
          location.pathname.indexOf('accountsummaryconfirm') !== -1
        ) {
          return true
        } else {
          return false
        }
        return
      }
      if (location.pathname.indexOf(pathname) === -1) {
        return false
      } else {
        return true
      }
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

    const download = async () => {
      console.log('props: ', props)
      if (!props.onOff) return

      if (!watchBillPage()) {
        return
      }
      clearInterval(checkLiushuiPage)
      clearInterval(checkoutBlockOverlayTimer)

      if (ruleForm.downloadMode == 2) {
        await sleep(3000)
        console.log('location.pathname', location.pathname)
        if (location.pathname.indexOf('accountsummary.htm') !== -1) {
          let aLInk: any = document.querySelector('#dr1 a')
          console.log('aLInk: ', aLInk);
          if (aLInk) {
            // aLInk.click()
            eventClick(aLInk)
          }else{
            setSyncStorage({ mode: 'download' })
          ctx.emit('onOffHandle', false)
          }
        } else if (location.pathname.indexOf('accountsummaryconfirm') !== -1) {
          // 获取最近10笔
          console.log('sss')
          let trs: any = document.querySelectorAll('#test table tr')
          console.log('trs: ', trs)
          let tables = []
          if (trs && trs.length > 1) {
            for (let index = 1; index < trs.length; index++) {
              const element = trs[index]
              let tds: any = element.querySelectorAll('td')
              tables.push({
                date: tds[0]['innerText'],
                description: tds[1]['innerText'],
                debit: tds[2]['innerText'],
                credit: tds[3]['innerText'],
              })
            }
          }
          console.log(tables)
          downloadFile(tables)
          // 重置
          clearTimeout(timer)
          clearInterval(cutDownNumTimer)
          cutDownNum.value = ruleForm.intervalTime
          timer = setTimeout(() => {
            let back: any = document.querySelector('.common_btn input')
            if (back) {
              back.click()
            }
          }, ruleForm.intervalTime * 1000 || 20000)
          cutDownNumTimer = setInterval(() => {
            cutDownNum.value--
            if (cutDownNum.value < 0) {
              clearInterval(cutDownNumTimer)
            }
          }, 1000)
        }
        return
      }

      getAccBalance()
      const liushuiHandle = async () => {
        console.log('liushuiHandle: ')
        //打开时间搜索框
        await sleep(1000)

        let bydateRadio: any = document.querySelector('input[id="bydate"]')
        if (bydateRadio) {
          bydateRadio.click()
          await sleep(1000)
        } else {
          ctx.emit('onOffHandle', false)
          return
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

        let startdate: any = document.querySelector('input[name="startdate"]')
        // startdate.value = '17/01/2024'
        startdate.value = today
        await sleep(1000)

        let iconExcel: any = document.querySelector('label[id="iconText"]')
        //  iconPdf  iconText
        iconExcel.click()
        await sleep(1000)

        let Submit3: any = document.querySelector('input[name="Submit3"]')
        Submit3.click()
      }

      liushuiHandle()

      // 重置
      clearTimeout(timer)
      clearInterval(cutDownNumTimer)
      cutDownNum.value = ruleForm.intervalTime
      timer = setTimeout(() => {
        let accountstatementLink: any = document.querySelector(
          'a[onclick="javascript:callURL(\'/saral/accountstatement.htm\')"]',
        )
        if (accountstatementLink) {
          accountstatementLink.click()
        } else {
          download()
        }
      }, ruleForm.intervalTime * 1000 || 20000)
      cutDownNumTimer = setInterval(() => {
        cutDownNum.value--
        if (cutDownNum.value < 0) {
          clearInterval(cutDownNumTimer)
        }
      }, 1000)
    }

    const downloadFile = async (list: any = [], flag: Boolean = true) => {
      let newList = list
      const ws = utils.json_to_sheet(newList)
      const wb = utils.book_new()
      utils.book_append_sheet(wb, ws, 'Data')
      writeFileXLSX(wb, 'sbi-last10.xlsx')
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

    const startHandle = async () => {
      setSyncStorage({ mode: 'download' })
      ctx.emit('onOffHandle', false)
      await sleep(1000)
      ctx.emit('onOffHandle', true)
    }
    const transForPageHandle = async () => {
      let transfer: any = document.querySelector('#ID_RTXNUI')
      if (transfer) {
        setSyncStorage({ mode: 'transer' })
        transfer.click()
        await sleep(1000)
        let transfer2: any = document.querySelector('#Make-Payments_Make-Payments')
        ctx.emit('onOffHandle', false)
        transfer2.click()
      }
    }

    const getAccBalance = () => {
      let debit_accountNo: any = document.querySelector('#debit_accountNo')
      let debit_branchCode: any = document.querySelector('#debit_branchCode')
      if (!debit_accountNo) return
      debit_accountNo = debit_accountNo.value
      console.log('debit_accountNo: ', debit_accountNo)
      debit_branchCode = debit_branchCode.value

      fetch('https://corp.onlinesbi.sbi/saral/getAccBalcheck.htm', {
        headers: {
          accept: 'text/plain, */*; q=0.01',
          'accept-language': 'zh-CN,zh;q=0.9',
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
          'x-requested-with': 'XMLHttpRequest',
        },
        referrer: 'https://corp.onlinesbi.sbi/saral/mypage.htm',
        referrerPolicy: 'strict-origin-when-cross-origin',
        body: `account_no=${debit_accountNo}&branchCode=${debit_branchCode}&userName=`,
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
      })
        .then((result) => {
          return result.json()
        })
        .then((result) => {
          console.log('result: ', result)
          accBalance.value = result.accBalance
        })
        .catch((err) => {})
    }

    // 与后台通信
    onMounted(async () => {
      let _intervalTime: number = await getSyncStorage('intervalTime')
      let _downloadMode: number = await getSyncStorage('downloadMode')
      let _reportUrl: any = await getSyncStorage('reportUrl')
      let onOff: any = (await getSyncStorage('onOff')) || false

      ruleForm.intervalTime = _intervalTime || 20
      ruleForm.downloadMode = _downloadMode || 1
      ruleForm.reportUrl = _reportUrl || ''
      cutDownNum.value = ruleForm.intervalTime

      if (onOff) {
        ctx.emit('onOffHandle', onOff)
      }
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
      startHandle,
      accBalance,
      transForPageHandle,
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
