<template>
  <main id="kk-container">
    <div style="width: 350px">
      <p style="font-size: 14px">此网站支持后台下载流水</p>
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
        <el-form-item label="自动刷新余额" prop="reportUrl">
          <el-switch v-model="ruleForm.autoLick" size="large" @change="autoClickHandle" />
          <el-popover
            title="说明"
            :width="200"
            trigger="hover"
            content="打开此开关，会自动点击刷新余额, 注意：需要转帐时需要把这个关闭"
          >
            <template #reference>
              <el-icon :size="24" color="#e6a23c"><QuestionFilled /></el-icon>
            </template>
          </el-popover>
        </el-form-item>
        <el-form-item label="自动刷新间隔(s)" prop="autoLickTime">
          <el-input type="number" v-model="ruleForm.autoLickTime" />
        </el-form-item>
        <el-form-item label="爬取间隔(s)" prop="intervalTime">
          <el-input type="number" v-model="ruleForm.intervalTime" />
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
          <li>1、需要在流水界面点击一次查询，类型选择"onscren"</li>
          <li>2、点击开关开始即可</li>
          <li>3、间隔时间在配置里面改</li>
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
let getAccNumberTimer: any = null
let autoClickTimer: any = null
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

    const autoClickFlag = ref(true)

    const ruleForm = reactive({
      intervalTime: 20, //爬取间隔时间
      autoLickTime: 20,
      reportUrl: '', //上报接口地址
      name: 'Hello',
      data: {},
      autoLick: false,
      accNumber: '', //accNumber
    })
    const rules = reactive({
      intervalTime: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
      desc: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
    })

    watch(
      () => props.data,
      (newValue) => {
        if (newValue) {
          try {
            let parseProps = JSON.parse(newValue)
            console.log('parseProps:- ', parseProps)
            getAccNumberTimer = setInterval(() => {
              let value: any = document.querySelector('p[data-testid="account-number"]')
              console.log('检查accNumber', value)
              if (value) {
                ruleForm.accNumber = value.innerText.replace(/\s/g, '')
                console.log('ruleForm.accNumber: ', ruleForm.accNumber)
                clearInterval(getAccNumberTimer)
              }
            }, 1000)
          } catch (error) {
            console.log('error: ', error)
          }
        }
      },
    )

    watch(
      () => props.onOff,
      (newValue) => {
        if (props.data) {
          let parseProps = JSON.parse(props.data)
          console.log('parseProps:- ', parseProps)
        }

        if (newValue) {
          if (!props.data) {
            ElMessage({
              message: '[启动失败]：请确认是否登录.',
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
            message: '[启动失败]：请下载一次流水操作(onscren).',
            type: 'error',
          })
          clearTimeout(timer)
          clearInterval(cutDownNumTimer)
          ctx.emit('onOffHandle', false)
        }
      },
    )

    const autoClickHandle = (value: Boolean) => {
      console.log('value: ', value)
      if (value) {
        ElMessage({
          message: '[开始自动切换刷新余额].',
          type: 'success',
        })
        autoClickPage()
      }else{
        clearInterval(autoClickTimer)
      }
    }

    const autoClickPage = () => {
      if (!props.data) {
        ElMessage({
          message: '[启动失败]：请确认是否登录.',
          type: 'error',
        })
        clearInterval(autoClickTimer)
        return
      }
      if(!ruleForm.autoLick){
        clearInterval(autoClickTimer)
        return
      }
      let checkTimer:any = null
      let delayTimer:any = null
      let navas:any = document.querySelectorAll('div[data-testid="PrimaryNavigation"] a')
      if(navas.length){
        autoClickTimer = setInterval(()=>{
          clearInterval(delayTimer)
          navas[0].click()
          checkTimer = setInterval(()=>{
           let load:any = document.querySelector('div[data-testid="web-loader-wrapper"]')
           console.log('load: ', load);
           if(!load){
            clearInterval(checkTimer)
            delayTimer = setTimeout(() => {
              navas[1].click()
            }, 2000);
           }
          },1000)

          // if(autoClickFlag.value){
          //   navas[0].click()
          // }else{
          //   navas[1].click()
          // }
          // autoClickFlag.value = !autoClickFlag.value

        }, ruleForm.autoLickTime * 1000)
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

    const download = () => {
      if (!props.onOff || !ruleForm.accNumber) return

      let parseProps = JSON.parse(props.data)
      console.log('parseProps:- ', parseProps)

      function add(n: any) {
        if (n <= 9) {
          return `0${n}`
        }
        return n
      }

      var myDate = new Date()
      var myYear = myDate.getFullYear() //获取完整的年份(4位,1970-????)
      var myMonth = add(myDate.getMonth() + 1) //获取当前月份(0-11,0代表1月)
      var myToday = add(myDate.getDate()) //获取当前日(1-31)

      let body2 = {
        accountNumber: ruleForm.accNumber,
        channels: ['DOWNLOAD'],
        period: {
          from: `${myYear}-${myMonth}-${myToday}T00:00:00+0530`,
          to: `${myYear}-${myMonth}-${myToday}T23:59:59+0530`,
        },
        format: 'EXCEL',
      }

      fetch('https://app.my.idfcfirstbank.com/api/account/v1/statement', {
        headers: {
          accept: 'application/json, text/plain, */*',
          'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-CA;q=0.7,ja-JP;q=0.6,ja;q=0.5',
          authorization: `Bearer ${parseProps.access_token}`,
          'content-type': 'application/json;charset=UTF-8',
          'enc-id-token': `${parseProps.enc_id_token}`,
          'sec-ch-ua-mobile': '?0',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-site',
          'session-tracing-id': 'sM17TEV9KQ7j840TMeeQT',
          'x-requested-with': 'XMLHttpRequest',
        },
        referrer: 'https://my.idfcfirstbank.com/',
        referrerPolicy: 'strict-origin-when-cross-origin',
        body: JSON.stringify(body2),
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
      })
        .then((res: any) => {
          if (res.status.toString().charAt(0) === '2') {
            return res.blob()
          }
          return false
        })
        .then((res) => {
          console.log('res: ', res)
          if (res) {
            // blob对象
            const a = document.createElement('a')
            const body: any = document.querySelector('body')
            // 这里注意添加需要下载的文件后缀；
            a.download = 'idfcCor.xlsx'
            a.href = window.URL.createObjectURL(res)
            a.style.display = 'none'
            body.appendChild(a)
            a.click()
            body.removeChild(a)
            window.URL.revokeObjectURL(a.href)
          }

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
      let _autoLickTime: number = await getSyncStorage('autoLickTime')
      let _reportUrl: any = await getSyncStorage('reportUrl')
      ruleForm.intervalTime = _intervalTime || 20
      ruleForm.autoLickTime = _autoLickTime || 20

      
      ruleForm.reportUrl = _reportUrl || ''
    })
    return {
      settingVisible,
      settingVisibleHandle,
      runGifSrc,
      ruleFormRef,
      ruleForm,
      rules,
      autoClickHandle,
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
<style>
.el-popover.el-popper {
  z-index: 9999999 !important;
}
</style>
