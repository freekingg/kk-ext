<template>
  <main id="kk-container">
    <div style="display: flex; align-items: center; width: 350px">
      <el-icon :size="24" color="#e6a23c" @click="helpHandle"><QuestionFilled /></el-icon>
      <p style="font-size: 14px; display: inline-block;margin: 0;">
        此网站支持不后台下载流水，需要停留在流水界面
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
          <li>1、在流水界面，选择好时间后，点击 "view" 查询流水</li>
          <li>2、如果有流水记录，则打开插件开关即可，如果没有流水，无法开启</li>
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
import useStorage from '../useStorage'
let timer: any = null
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
        console.log('newValue: ', newValue)

        clearTimeout(timer)
        clearInterval(cutDownNumTimer)

        if (newValue) {
          let accountstatement_csvAcctStmt = document.querySelector('#accountstatement_csvAcctStmt')
          if (!accountstatement_csvAcctStmt) {
            ElMessage({
              message: '[启动失败]：请下载一次流水操作csv.',
              type: 'error',
            })
            ctx.emit('onOffHandle', false)

            function add(n:any){
                if(n<=9){
                    return `0${n}`
                }
                return n
            }

            var myDate = new Date()
            var myYear = myDate.getFullYear() //获取完整的年份(4位,1970-????)
            var myMonth = add(myDate.getMonth() + 1) //获取当前月份(0-11,0代表1月)
            var myToday = add(myDate.getDate()) //获取当前日(1-31)

            let accountNo:any = document.querySelector('#accountNo')
            if(accountNo){
            let accountNoOption:any = accountNo.querySelectorAll('option')
              accountNo.value = accountNoOption[accountNoOption.length-1].value
            }

            let fromDate:any = document.querySelector('#fromDate')
            if(fromDate){
              fromDate.value = `${myMonth}/${myToday}/${myYear}`
            }
            let toDate:any = document.querySelector('#toDate')
            if(toDate){
              toDate.value = `${myMonth}/${myToday}/${myYear}`
            }

            return
          }

          ElMessage({
            message: '[任务执行成功].',
            type: 'success',
          })
          download()
        } else if (!newValue) {
          setSyncStorage({ onOff: false })
          ElMessage({
            message: '[任务已经关闭].',
            type: 'info',
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

      let dataForm: any = {}
      let accountstatement_csvAcctStmt = document.querySelector('#accountstatement_csvAcctStmt')
      if (accountstatement_csvAcctStmt) {
        let accountstatement: any = document.querySelector('#accountstatement')
        let accountstatementInput = accountstatement.querySelectorAll('#accountstatement input')
        let accountstatementSel = accountstatement.querySelectorAll('#accountstatement select')
        for (const iterator of accountstatementInput) {
          if (iterator.name) {
            dataForm[iterator.name] = iterator.value
          }
        }
        for (const iterator of accountstatementSel) {
          if (iterator.name) {
            dataForm[iterator.name] = iterator.value
          }
        }
      } else {
        ElMessage({
          message: '[启动失败]：请下载一次流水操作csv.',
          type: 'error',
        })
        return
      }

      let parseProps = {
        fromDt: dataForm.fromDt,
        toDt: dataForm.toDt,
        'action:csvAcctStmt': 'CSV',
        handleId: '',
        csrftokenid: dataForm.csrftokenid,
        accountNo: 'select',
      }
      console.log('parseProps: ', parseProps)

      let body = `accountNo=select&fromDt=${parseProps.fromDt}&toDt=${parseProps.toDt}&action%3AcsvAcctStmt=CSV&handleId=&csrftokenid=ACA02B6BB57F417493B71DEBAF8C3930`

      fetch('https://www.iobnet.co.in/ibanking/accountstatement.do', {
        headers: {
          accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
          'accept-language': 'zh-CN,zh;q=0.9,en-CA;q=0.8,en;q=0.7,ja-JP;q=0.6,ja;q=0.5',
          'cache-control': 'max-age=0',
          'content-type': 'application/x-www-form-urlencoded',
          'sec-ch-ua': '".Not/A)Brand";v="99", "Google Chrome";v="103", "Chromium";v="103"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"macOS"',
          'sec-fetch-dest': 'document',
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'same-origin',
          'sec-fetch-user': '?1',
          'upgrade-insecure-requests': '1',
        },
        referrer: 'https://www.iobnet.co.in/ibanking/accountstatement.do',
        referrerPolicy: 'strict-origin-when-cross-origin',
        body,
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
      })
        .then((res) => {
          // 这里解析body
          return res.blob()
        })
        .then((res) => {
          // blob对象
          const a = document.createElement('a')
          const body: any = document.querySelector('body')
          // 这里注意添加需要下载的文件后缀；
          a.download = 'iobp.csv'
          a.href = window.URL.createObjectURL(res)
          a.style.display = 'none'
          body.appendChild(a)
          a.click()
          body.removeChild(a)
          window.URL.revokeObjectURL(a.href)

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
        })
        .catch((err) => {
          console.log('下载出错: ', err)
          clearTimeout(timer)
          clearInterval(cutDownNumTimer)
          ElMessage({
            message: '[下载出错]：请刷新浏览器重新操作.',
            type: 'error',
          })
        })
    }

    const getCookie = (name: string) => {
      var arr,
        reg = new RegExp('(^| )' + name + '=([^;]*)(;|$)')

      if ((arr = document.cookie.match(reg))) return unescape(arr[2])
      else return null
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
      // ctx.emit('onOffHandle', onOff)
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
