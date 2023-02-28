<template>
  <div id="kk-container">
    <div style="width: 350px">
      <el-icon :size="24" color="#e6a23c"><QuestionFilled /></el-icon>
      <p style="font-size: 14px">此网站支持接口下载流水 <br /></p>
      <br />
      <p style="font-size: 14px; color: red">一定要到达流水界面一次,才可以自动执行下载 <br /></p>
    </div>
    <section class="run-status" v-if="true">
      <!-- <img :src="runGifSrc"> -->
      <el-result icon="info" :title="onOff ? '运行中' : '未启动'">
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
    <!-- <div class="btn-area" style="display: flex; justify-content: center; margin-bottom: 10px">
      <el-button type="primary" @click="startHandle">下载流水</el-button>
      <el-button type="primary" @click="transForPageHandle">转账</el-button>
    </div> -->
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
        <el-form-item label="分页条数" prop="pgLimit">
          <el-input type="number" v-model="ruleForm.pgLimit" />
        </el-form-item>
        <el-form-item label="爬取日期" prop="date">
          <el-input v-model="ruleForm.date" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="submitForm(ruleFormRef)">保存</el-button>
        </el-form-item>
      </el-form>
    </section>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, toRaw, reactive, toRefs, watch } from 'vue'
import { ElMessage, ElIcon } from 'element-plus'
import { QuestionFilled } from '@element-plus/icons-vue'
import useStorage from '../useStorage'
let timer: any = null
let delayTimer: any = null
let cutDownNumTimer: any = null

export default defineComponent({
  components: { QuestionFilled, ElIcon },
  props: {
    onOff: Boolean,
    data: String,
  },
  emits: ['onOffHandle'],
  setup(props: any, ctx) {
    const cutDownNum = ref(20)
    const checkNum = ref(0)
    const settingVisible = ref(false)
    const runGifSrc = ref(chrome.runtime.getURL('img/runing.gif'))
    const state = reactive({
      currentTab: null,
      files: {},
    })

    const { setSyncStorage, getSyncStorage } = useStorage()

    const ruleFormRef = ref()
    const dialogHelpVisible = ref(false)

    const ruleForm: any = reactive({
      intervalTime: 20, //爬取间隔时间
      reportUrl: '', //上报接口地址
      name: 'Hello',
      data: {},
      date: '',
      accNumber: '', //accNumber
      kk: null,
      pgLimit: 500,
      pgNum: 1,
      dataList: [],
    })
    const rules = reactive({
      intervalTime: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
      pgLimit: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
      date: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
    })

    watch(
      () => props.data,
      async (newValue) => {
        let newProps = JSON.parse(newValue)
        console.log('newValue: ', newProps)
        if (newProps.type === 'updatePaams') {
          ElMessage({
            message: '请求参数已更新.可以进行下载了',
            type: 'success',
          })
          ElMessage({
            message: '请求参数已更新.可以进行下载了',
            type: 'success',
          })
          ElMessage({
            message: '请求参数已更新.可以进行下载了',
            type: 'success',
          })
          ElMessage({
            message: '请求参数已更新.可以进行下载了',
            type: 'success',
          })
        }

        if (newProps.type === 'error') {
          ElMessage({
            message: '出错了，请查看控制台或者刷新页面',
            type: 'error',
          })
          ElMessage({
            message: '出错了，请查看控制台或者刷新页面',
            type: 'error',
          })
          ElMessage({
            message: '出错了，请查看控制台或者刷新页面',
            type: 'error',
          })
          ElMessage({
            message: '出错了，请查看控制台或者刷新页面',
            type: 'error',
          })
          ctx.emit('onOffHandle', false)
        }
      },
    )

    watch(
      () => props.onOff,
      async (newValue) => {
        // console.log('newValue: ', newValue)
        let kk = localStorage.getItem('kk')

        clearTimeout(timer)
        clearInterval(cutDownNumTimer)
        clearInterval(delayTimer)

        if (newValue) {
          if (kk) {
            // 构造数据
            const cEvt = new CustomEvent('equitasEvent', {
              detail: {
                type: 'download',
                data: toRaw(ruleForm),
              },
            })
            document.dispatchEvent(cEvt)
            ctx.emit('onOffHandle', true)
            return
          }
          ElMessage({
            message: '先点击到下载流水界面一次...',
            type: 'error',
          })
          // 构造数据
          const cEvt = new CustomEvent('equitasEvent', {
            detail: {
              type: 'stop',
              data: toRaw(ruleForm),
            },
          })
          document.dispatchEvent(cEvt)
          ctx.emit('onOffHandle', false)
        } else if (!newValue) {
          ElMessage({
            message: '[任务已经关闭].',
            type: 'info',
          })
           // 构造数据
           const cEvt = new CustomEvent('equitasEvent', {
            detail: {
              type: 'stop',
              data: toRaw(ruleForm),
            },
          })
          document.dispatchEvent(cEvt)
        } else {
          ElMessage({
            message: '先点击到下载流水界面一次.',
            type: 'error',
          })
          ctx.emit('onOffHandle', false)
           // 构造数据
           const cEvt = new CustomEvent('equitasEvent', {
            detail: {
              type: 'stop',
              data: toRaw(ruleForm),
            },
          })
          document.dispatchEvent(cEvt)
        }
      },
    )

    const getPage = () => {
      const kkwin: any = window
      let kk = localStorage.getItem('kk')
      let local = null
      if (kk) {
        local = JSON.parse(kk)
      }

      let dateObj:any = getDay()
      let today = dateObj.today
      let timestamp = `${today}T${dateObj.myHour}:${dateObj.myMillsi}:${dateObj.mySecond}.607Z`

      let req = {
        appzillonHeader: {
          appId: local.appId,
          sessionId: local.sessionId,
          deviceId: local.deviceId,
          requestKey: local.requestKey,
          userId: local.userId,
          screenId: local.screenId,
          status: 'success',
          source: 'APPZILLON',
          interfaceId: 'viewAccountStatement',
          os: 'WEBCONTAINER',
          origination: '',
          ip: 'X.X.X.X',
          browserName: 'Chrome',
          browserVersion: '110',
          requestID: 'ACC',
          async: 'false',
          clientNonce: local.clientNonce,
          serverNonce: local.serverNonce,
        },
        appzillonBody: {
          getDigiAccountStatementRequest: {
            msgBdy: {
              acctId: local.account_no,
              frDt: '2023-02-05',
              toDt: '2023-02-05',
              lastBalanceAmount: 0,
              nbOfTxns: ruleForm.pgLimit,
              pgNum: ruleForm.pgNum,
            },
            msgHdr: {
              msgId: 'SERVER_TXN_REF_NO',
              cnvId: 'SERVER_TXN_REF_NO',
              extRefId: 'SERVER_TXN_REF_NO',
              bizObjId: 'SERVER_TXN_REF_NO',
              appId: 'FOSC',
              timestamp: timestamp,
              authInfo: { brnchId: '9999', usrId: 'CORPUSER' },
            },
          },
        },
      }

      console.log('分页请求数据', req)

      fetch('https://inet.equitasbank.com/EquitasCorp/AppzillonWeb', {
        headers: {
          accept: '*/*',
          'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-CA;q=0.7,ja-JP;q=0.6,ja;q=0.5',
          actionid: 'SERVERREQUEST',
          appid: local.appId,
          'content-type': 'application/json; charset=UTF-8',
          owasp_csrftoken: localStorage.getItem('csrf'),
          requestkey: local.appId,
          screenid: 'Sa_AccStatement',
          'sec-ch-ua': '"Chromium";v="110", "Not A(Brand";v="24", "Google Chrome";v="110"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
          sessionidfromhttp: localStorage.getItem('sessionidfromhttp'),
          signedin: '',
          'x-requested-with': 'XMLHttpRequest',
        } as any,
        referrer: 'https://inet.equitasbank.com/EquitasCorp/',
        referrerPolicy: 'strict-origin-when-cross-origin',
        body: kkwin.kencryptRequest(JSON.stringify(req)),
        // "body": "8Ykx1JY1anuoeCvUAXrWfg==~P/lAHmjZ3UYptH5+iA/ToCcaBUi8KpdyeZwN5POpw1WtZFW8rWJqfw2YTfaPcegLE3WjbmSTX+yHSH7gDX1pGot5ReEq7ncnfagV4f9YTCYL3PgI+Gi/CmrPksp5B9csFxtCUikuTO+gspRrG7hrp8x3pFgiYdfAHqq3oSW2b4jw+FMDjIp5H2lrxkLV0OPzT/ln2ivJSnVfmZqT7G3G02+cf1wDTF1qLOSFL58gv6soATVSAaPcNF+GrcLo3mo1PXXq3IvSJvJc9Qmo0Lx4hGiR0Fz7bnpBgUiKjgn04HO8SLvGp9qVVcQEJj5jvNDshz3UOHnKbu330IO+x2zkRaL8nR4A8XnsWphvbtYKW9PduCuVE8o0Hz8dGhqiyzCU7TUNG6gOjcZul1younUcVxq1zxhnrUEkSAm02l5hJI8lc9O6es8Yxmpp2d6JqaVLULOieYf68TvC+Uo6uaHPtlZJo1JLvs1sE9CrPxXDcNvIHOt5PPr8phXVR+0lp+eGW74b8efSFbdMgD5oJOGJsjtbgHHOevJvPg4KOuxj2lx8yQ3YIblxrRg0LBZHooWkgeYRa+yGblWWDOnO9+Q2RsqUGfMNyfr5NBjZ49d2eWrsPU/Mde5NMwI/FKuheF+gOs/z5NNyK03t8XHO2uqDo8fuKPg/aLvN4wZe4ClTIZoBUwAZ/fIzvLsaxydkse256RzRMMiXfjNlRwoVar6dL3+PmUp1ghX6f9IYPHICUZVqR/3ZmXzwAg9TO5p1PMLPTsXXi2jaJnUALN2AefwzBG367CUsEgjxDqI6Qljc6FVGuyzFrP0phVSY2gIQSyOq89nV+b9biVm21voDuD5gX40fBmaZKSbJXeDalDCtifJEQHD042loj0i0BEaEnbZuFTT96Hu3QTehqclfe9c8Ebg1rmIzpICm5NkTsfg9EL0oc7qr9xJZlkZ8DYV+vN9OLbo+11Gp234K/+nVEQR/b5n3TzeUFBbIdDGxAWHOIhiKxEiB1sddKNvuhSZe4iW2K7eA3L80Wt6lbKn46+IeIhU9/hFSo/y5AdMytnI9AYBL99LviyAzIfpQOsOWVFLIf3FCuxXgTWPjtg/reEwn207iZBUVw78K7Mpm2VXLkw9rp8iI1HmPfq/9gtqNgonZ4OP5YqiWE/relL9HVwtmcsuNFy014VuNxW4X1NZBdaoOHFJQSVQiDG46H4arVL/fNgO0Fl9OajlBOEv31aM3pQ==",
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
      })
        .then((response) => response.text())
        .then((res) => {
          let result = kkwin.kdecryptResponse(res)
          console.log('请求分页: ', result)
          if (result) {
            try {
              let res = JSON.parse(result)
              console.log('分页数据返回: ', res)
              let LastPgInd = res.appzillonBody.getDigiAccountStatementResponse.msgBdy.LastPgInd
              let account: any = res.appzillonBody.getDigiAccountStatementResponse.msgBdy.account
              if (LastPgInd === 'N') {
                ruleForm.pgNum += 1
                if (account.length) {
                  ruleForm.dataList.push(...account)
                  setTimeout(() => {
                    getPage()
                  }, 1000)
                }
              } else {
                ruleForm.dataList.push(...account)
                let resultList = JSON.parse(JSON.stringify(ruleForm.dataList))
                console.log('下载完成了', resultList)
                kkwin.data2Excel(resultList)
                ruleForm.pgNum = 1
                ruleForm.dataList = []
                checkNum.value = 0
                cutDownNum.value = ruleForm.intervalTime
                delayTimer = setTimeout(() => {
                  console.log(`等待${ruleForm.intervalTime}秒再下一轮`)
                  getPage()
                }, ruleForm.intervalTime * 1000)
                cutDownNumTimer = setInterval(() => {
                  cutDownNum.value--
                  if (cutDownNum.value < 0) {
                    clearInterval(cutDownNumTimer)
                  }
                }, 1000)
              }
              // ToExcel(res.appzillonBody.getDigiAccountStatementResponse.file,(res.appzillonBody.getDigiAccountStatementResponse.fileName || 'equitas'))
            } catch (error) {
              console.log('error: ', error)
            }
          }
        })
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

    const getDay = () =>{
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
      var myHour = add(myDate.getHours()) //获取当前日(1-31)
      var myMillsi = add(myDate.getMilliseconds()) //获取当前日(1-31)
      var mySecond = add(myDate.getSeconds()) //获取当前日(1-31)
      let today = `${myYear}-${myMonth}-${myToday}`
      return { myYear, myMonth, myToday, myHour, myMillsi, mySecond, today }
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
      let dateObj:any = getDay()
      let today = dateObj.today
      console.log('today: ', today);
      ruleForm.date = today
      localStorage.removeItem('kk')
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
