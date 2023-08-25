<template>
  <main id="kk-container">
    <div style="display: flex; align-items: center; width: 350px">
      <p style="font-size: 14px; display: inline-block">
        1、<span style="color: red;">此网站支持后台下载流水</span> <br>
        2、在Stagements页面选择more,再选择日期查询一次即可后台下载
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
        <el-form-item>
          <el-button type="primary" @click="submitForm(ruleFormRef)">保存</el-button>
        </el-form-item>
      </el-form>
    </section>
    <el-dialog v-model="dialogHelpVisible" title="Tips" width="30%">
      <div>
        <strong>使用方法</strong>
        <ul style="padding: 0 20px">
          <li>1、在Stagements页面选择more,再选择时间日期查询一次即可</li>
          <li>2、直接打开插件开关即可</li>
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
    const cutDownNum = ref(20)
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
      accNumber: '',
    })
    const dataForm = reactive({
      token: '',
      accountId: '',
      accountNumber: '',
      fromDate: '',
      toDate: '',
      format: 'xlsx',
      isEmail: false,
    })
    const rules = reactive({
      intervalTime: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
      desc: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
    })

    watch(
      () => props.onOff,
      (newValue) => {
        if (newValue) {
          clearTimeout(timer)
          clearInterval(cutDownNumTimer)

          let flag = checkNavPage()
          if (!flag) {
            ElMessage({
              message: '[启动失败]：需要流水界面选择日期进行一次查询.',
              type: 'error',
            })
            ctx.emit('onOffHandle', false)
          } else {
            ElMessage({
              message: '[任务执行成功].',
              type: 'success',
            })
            download()
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
            message: '[启动失败]：需要流水界面选择日期进行一次查询.',
            type: 'error',
          })
          clearTimeout(timer)
          clearInterval(cutDownNumTimer)
          ctx.emit('onOffHandle', false)
        }
      },
    )

    const helpHandle = () => {
      dialogHelpVisible.value = true
    }

    const checkNavPage = () => {
      var childHtml: any = document.getElementById('icanvas')
      if (!childHtml && !dataForm.accountId && !dataForm.fromDate) return false

      let contentWindow = childHtml.contentWindow
      let activeTabDom: any = contentWindow.document.querySelector('#activeTab')
      if (activeTabDom && activeTabDom.value == 'more') {
        let csrfDom: any = contentWindow.document.querySelector('input[name="_csrf"]')
        if (csrfDom) {
          dataForm.token = csrfDom.value
        }
        let accountIdDom: any = contentWindow.document.querySelector('#accountId')
        if (accountIdDom) {
          dataForm.accountId = accountIdDom.value
        }
        let accountNumberDom: any = contentWindow.document.querySelector(
          'input[name="accountNumber"]',
        )
        if (accountNumberDom) {
          dataForm.accountNumber = accountNumberDom.value
        }
        let fromDateDom: any = contentWindow.document.querySelector('input[name="fromDate"]')
        if (fromDateDom) {
          dataForm.fromDate = fromDateDom.value
        }
        let toDateDom: any = contentWindow.document.querySelector('input[name="toDate"]')
        if (toDateDom) {
          dataForm.toDate = toDateDom.value
        }
      }

      console.log(dataForm)
      return true
      // if (dataForm.token && dataForm.accountId && dataForm.accountNumber) {
      //   return true
      // }
      // return false
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
      if (!props.onOff) return

      let body1 = `_csrf=${dataForm.token}&accountId=${dataForm.accountId}&accountNumber=${dataForm.accountNumber}&fromDate=${dataForm.fromDate}&toDate=${dataForm.toDate}&format=${dataForm.format}&isEmail=false&fromAmount=&toAmount=&monthOf=&noOfTransactions=`
      let body2 = `_csrf=${dataForm.token}`

      fetch(
        'https://corporate.bandhanbank.com/Corporatebanking/account/statement/report-statement',
        {
          headers: {
            accept: '*/*',
            'accept-language': 'zh-CN,zh;q=0.9,en-CA;q=0.8,en;q=0.7,ja-JP;q=0.6,ja;q=0.5',
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'sec-ch-ua': '"Chromium";v="104", " Not A;Brand";v="99", "Google Chrome";v="104"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'x-csrf-token': `${dataForm.token}`,
            'x-requested-with': 'XMLHttpRequest',
          },
          referrer: 'https://corporate.bandhanbank.com/Corporatebanking/account/statement/start',
          referrerPolicy: 'same-origin',
          body: body1,
          method: 'POST',
          mode: 'cors',
          credentials: 'include',
        },
      )
        .then((res) => {
          if (!res.ok) {
            // 重置
            clearTimeout(timer)
            clearInterval(cutDownNumTimer)
            cutDownNum.value = ruleForm.intervalTime
            timer = setTimeout(() => {
              download()
            }, ruleForm.intervalTime * 1000 || 30000)
            cutDownNumTimer = setInterval(() => {
              cutDownNum.value--
              if (cutDownNum.value < 0) {
                clearInterval(cutDownNumTimer)
              }
            }, 1000)
            return
          }

          fetch('https://corporate.bandhanbank.com/Corporatebanking/report-statement/download', {
            headers: {
              accept: '*/*',
              'accept-language': 'zh-CN,zh;q=0.9,en-CA;q=0.8,en;q=0.7,ja-JP;q=0.6,ja;q=0.5',
              'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'sec-ch-ua': '"Chromium";v="104", " Not A;Brand";v="99", "Google Chrome";v="104"',
              'sec-ch-ua-mobile': '?0',
              'sec-ch-ua-platform': '"macOS"',
              'sec-fetch-dest': 'empty',
              'sec-fetch-mode': 'cors',
              'sec-fetch-site': 'same-origin',
              'x-csrf-token': `${dataForm.token}`,
              'x-requested-with': 'XMLHttpRequest',
            },
            referrer: 'https://corporate.bandhanbank.com/Corporatebanking/account/statement/start',
            referrerPolicy: 'strict-origin-when-cross-origin',
            body: body2,
            method: 'POST',
            mode: 'cors',
            credentials: 'include',
          })
            .then((res) => {
              // 这里解析body
              return res.arrayBuffer()
            })
            .then((res) => {
              // blob对象
              const a = document.createElement('a')
              const body: any = document.querySelector('body')
              // 这里注意添加需要下载的文件后缀；
              a.download = 'bandhan.xlsx'
              a.href = window.URL.createObjectURL(
                new Blob([res], {
                  type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                }),
              )
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
        })
        .catch((e) => {
          console.log('e', e)
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
      ruleForm.intervalTime = _intervalTime || 20
      ruleForm.reportUrl = _reportUrl || ''
    })
    return {
      settingVisible,
      dialogHelpVisible,
      helpHandle,
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
