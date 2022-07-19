<template>
  <main id="kk-container">
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
  </main>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, reactive, toRefs, watch } from 'vue'
import { ElMessage } from 'element-plus'
import useStorage from '../useStorage'
let timer: any = null
let cutDownNumTimer: any = null
export default defineComponent({
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
        if (props.data && newValue) {
          let params = JSON.parse(props.data)
          if (!params || params.ser !== 'STDWGO') {
            ElMessage({
              message: '[启动失败]：请下载一次流水操作.',
              type: 'error',
            })
            ctx.emit('onOffHandle', false)
            clearTimeout(timer)
            clearInterval(cutDownNumTimer)
          } else {
            ElMessage({
              message: '[任务执行成功].',
              type: 'success',
            })
            download()
            // timer = setInterval(() => {
            //   download()
            // }, ruleForm.intervalTime * 1000 || 30000)
          }
        } else if (!newValue) {
          ElMessage({
            message: '[任务已经关闭].',
            type: 'info',
          })
          clearTimeout(timer)
          clearInterval(cutDownNumTimer)
        } else {
          ElMessage({
            message: '[启动失败]：请下载一次流水操作.',
            type: 'error',
          })
          clearTimeout(timer)
          clearInterval(cutDownNumTimer)
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

    const checkOverlay = () => {
      let hasOverlay = document.querySelector(
        '.cdk-global-overlay-wrapper .cdk-overlay-pane.mx-session-popup-class',
      )
      if (hasOverlay) {
        let jxbtn: any = document.querySelector(
          '.cdk-global-overlay-wrapper .mat-raised-button.mat-warn',
        )
        console.log('发现超时继续按钮', jxbtn)
        if (jxbtn) {
          jxbtn.click()
        }
      }

      let hasOverlay2 = document.querySelector('.mat-dialog-container.ng-trigger-dialogContainer')
      if (hasOverlay2) {
        let jxbtn2: any = document.querySelector(
          '.mat-dialog-container.ng-trigger-dialogContainer .mat-raised-button.mat-warn',
        )
        console.log('发现超时继续按钮2', jxbtn2)
        if (jxbtn2) {
          jxbtn2.click()
        }
      }
    }

    const download = () => {
      let xxsrftoken = getCookie('XSRF-TOKEN')
      if (!xxsrftoken || !props.onOff) return

      let parseProps = JSON.parse(props.data)
      console.log('parseProps: ', parseProps);

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
      var myToday1 = '03' //获取当前日(1-31)
      var myToday2 = '09' //获取当前日(1-31)

      let body = `fromdate=${parseProps.fromdate}&todate=${parseProps.todate}&month=&year=&selectedValue=0&accNumber=${parseProps.accNumber}&docType=2&data=0&referenceId=${parseProps.data.referenceId}&ser=STDWGO&app=OC&mxrs=2000`
      console.log('body: ', body);

      fetch('https://omni.axisbank.co.in/wsprod/mib/servlets/report', {
        headers: {
          accept: 'application/json, text/plain, */*',
          'content-type': 'text/plain',
          'sec-fetch-site': 'same-origin',
          'X-XSRF-TOKEN': `${xxsrftoken}`,
        },
        referrer: 'https://omni.axisbank.co.in/axisretailbanking/',
        referrerPolicy: 'strict-origin-when-cross-origin',
        // body: body,
        body: body,
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
          a.download = 'axisDownloadName.xls'
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
          }, ruleForm.intervalTime * 1000 || 30000)
          cutDownNumTimer = setInterval(() => {
            cutDownNum.value--
            checkOverlay()
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

    // 与后台通信
    onMounted(async () => {
      // chrome.runtime.sendMessage({ type: "POPUP_INIT" }, async tab => {
      //   state.currentTab = await tab;
      //   console.log(state.currentTab);
      // });
      let _intervalTime: number = await getSyncStorage('intervalTime')
      let _reportUrl: any = await getSyncStorage('reportUrl')
      ruleForm.intervalTime = _intervalTime || 30
      ruleForm.reportUrl = _reportUrl || ''
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
