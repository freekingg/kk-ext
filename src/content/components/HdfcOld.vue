<template>
  <main id="kk-container">
    <div style="display: flex; align-items: center; width: 350px">
      <el-icon :size="24" color="#e6a23c" @click="helpHandle"><QuestionFilled /></el-icon>
      <p style="font-size: 14px; display: inline-block; margin: 0">
        此网站直接接口后台下载，登录后,直接点开始即可,如果有多帐号，需要在下面配置
      </p>
    </div>
    <section class="run-status">
      <!-- <img :src="runGifSrc"> -->
      <el-result icon="info" :title="onOff ? '运行中' + cutDownNum + 's' : '未启动'">
        <template #icon>
          <img style="width: 100px" :src="runGifSrc" v-if="onOff" />
        </template>
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
        <el-form-item label="帐号">
          <el-input v-model="ruleForm.subAccount" />
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
          <li>1、在流水界面，直接打开插件开关即可</li>
          <li>2、下载间隔时间从设置里面配置</li>
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
import { writeFileXLSX, utils } from 'xlsx'
import { sleep, Timer } from '../../utils/index'
let timer: any = null
let cutDownNumTimer: any = null
let checkDownBtnTimer: any = null
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
    const state = reactive({
      currentTab: null,
    })

    const { setSyncStorage, getSyncStorage } = useStorage()

    const ruleFormRef = ref()
    const form1Params = ref('')
    const dialogHelpVisible = ref(false)

    const ruleForm = reactive({
      intervalTime: 20, //爬取间隔时间
      reportUrl: '', //上报接口地址
      name: 'Hello',
      subAccount: '',
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
        clearTimeout(timer)
        clearInterval(cutDownNumTimer)
        clearInterval(checkDownBtnTimer)
        if (newValue) {
          setSyncStorage({ onOff: newValue })
          if (location.href === 'https://netbanking.hdfcbank.com/netbanking/entry') {
            // 接口形式
            request()
            // 点击形式
            // download()
            ElMessage({
              message: '[任务执行成功].',
              type: 'success',
            })
          } else {
            ElMessage({
              message: '[请确认已经登录,并且在流水界面].',
              type: 'error',
            })
            setSyncStorage({ onOff: false })
            ctx.emit('onOffHandle', false)
          }
        } else if (!newValue) {
          setSyncStorage({ onOff: false })
          ElMessage({
            message: '[任务已经关闭].',
            type: 'error',
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

    const downloadTxtFile = (content: any, fileName: any) => {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const link = document.createElement('a')
      link.download = fileName
      link.href = window.URL.createObjectURL(blob)
      link.click()
    }

    const request = () => {
      if (!props.onOff) return
      let params1 = form1Params.value
      fetch('https://netbanking.hdfcbank.com/netbanking/entry', {
        headers: {
          accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'accept-language': 'zh,zh-CN;q=0.9,en;q=0.8,en-CA;q=0.7,ja-JP;q=0.6,ja;q=0.5',
          'cache-control': 'max-age=0',
          'content-type': 'application/x-www-form-urlencoded',
          'sec-ch-ua': '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'sec-fetch-dest': 'frame',
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'same-origin',
          'sec-fetch-user': '?1',
          'upgrade-insecure-requests': '1',
        },
        referrer: 'https://netbanking.hdfcbank.com/netbanking/entry',
        referrerPolicy: 'strict-origin-when-cross-origin',
        body: params1,
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
      })
        .then((result) => {
          result
            .text()
            .then((htmlString) => {
              // 正则表达式模式
              const inputTagRegex = /<input.*?>/g
              const attributeRegex = /([^\s=]+)\s*=\s*"([^"]*)"/g

              // 用正则表达式匹配HTML字符串中的所有input标签
              let inputTags = htmlString.match(inputTagRegex) || []

              // 遍历所有的input标签，提取它们的name和value属性
              let inputs = inputTags.map((inputTag) => {
                let input: any = {}
                let attributes = inputTag.match(attributeRegex) || []

                // 遍历所有的属性，提取name和value
                attributes.forEach((attribute) => {
                  let [_, name, value] = attribute.match(/([^\s=]+)\s*=\s*"([^"]*)"/) || []
                  if (name) input[name] = value
                })
                return input
              })
              let fldRequestId = inputs.find((item) => item.name === 'fldRequestId')
              console.log('fldRequestId: ', fldRequestId)
              let fldSessionId = inputs.find((item) => item.name === 'fldSessionId')
              console.log('fldSessionId: ', fldSessionId)

              // 定义正则表达式模式
              const variableRegex = /accounts\[count\]\s*=\s*"([^;"]*)"/g

              // 使用正则表达式匹配字符串中的变量值
              const match = variableRegex.exec(htmlString)
              // 获取匹配到的变量值
              let acc = match && match[1]
              if (ruleForm.subAccount) {
                acc = ruleForm.subAccount.trim()
              }
              console.log('acc', acc)

              if (fldRequestId) {
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
                // 调查询接口
                // let body = `fldAppId=RS&fldTxnId=SIN&fldScrnSeqNbr=02&fldSessionId=${fldSessionId.value}&fldRequestId=${fldRequestId.value}&fldAcctNo=${acc}&fldTxnType=A&fldNbrStmt=20&fldAccType=&fldAccBranch=&fldFromDate=${today}&fldToDate=${today}&selAccttype=SCA&selAcct=${acc}&radTxnType=C&cmbTxnType=A&cmbNbrStmt=20`
                // fetch('https://netbanking.hdfcbank.com/netbanking/entry', {
                //   headers: {
                //     accept:
                //       'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                //     'accept-language': 'zh,zh-CN;q=0.9,en;q=0.8,en-CA;q=0.7,ja-JP;q=0.6,ja;q=0.5',
                //     'cache-control': 'max-age=0',
                //     'content-type': 'application/x-www-form-urlencoded',
                //     'sec-ch-ua': '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"',
                //     'sec-ch-ua-mobile': '?0',
                //     'sec-ch-ua-platform': '"Windows"',
                //     'sec-fetch-dest': 'frame',
                //     'sec-fetch-mode': 'navigate',
                //     'sec-fetch-site': 'same-origin',
                //     'sec-fetch-user': '?1',
                //     'upgrade-insecure-requests': '1',
                //   },
                //   referrer: 'https://netbanking.hdfcbank.com/netbanking/entry',
                //   referrerPolicy: 'strict-origin-when-cross-origin',
                //   body: body,
                //   method: 'POST',
                //   mode: 'cors',
                //   credentials: 'include',
                // })
                //   .then((result) => {
                //     result
                //       .text()
                //       .then((result) => {
                //         // console.log('result: ', result)

                //         downloadTxtFile(result, 'hdfcOld.txt')

                //         // 重置
                //         clearTimeout(timer)
                //         clearInterval(cutDownNumTimer)
                //         cutDownNum.value = ruleForm.intervalTime
                //         timer = setTimeout(() => {
                //           request()
                //         }, ruleForm.intervalTime * 1000 || 20000)
                //         cutDownNumTimer = setInterval(() => {
                //           cutDownNum.value--
                //           if (cutDownNum.value < 0) {
                //             clearInterval(cutDownNumTimer)
                //           }
                //         }, 1000)
                //       })
                //       .catch((err) => {})
                //   })
                //   .catch((err) => {})

                // 调下载接口
                // fldAppId=RS&fldTxnId=SIN&fldScrnSeqNbr=04&fldSessionId=843719614QYGBGJVMV&fldRequestId=843719614QYGBGJVMV1474125ESPN&fldAcctNo=&fldAcctNbr=50100429730781++&fldModule=CH&fldNbrStmt=20&fldToDate=01%2F07%2F2023&fldFromDate=01%2F07%2F2023&fldTxnType=A&fldRoleId=NOROLE&fldAcctBrn=NADESAR&l_dummy=&l_dummy=&l_dummy=&l_dummy=&l_dummy=&fldFormatType=X
                let body2 = `fldAppId=RS&fldTxnId=SIN&fldScrnSeqNbr=04&fldSessionId=${fldSessionId.value}&fldRequestId=${fldRequestId.value}&fldAcctNo=&fldAcctNbr=${acc}&fldModule=CH&fldNbrStmt=20&fldToDate=${today}&fldFromDate=${today}&fldTxnType=A&fldRoleId=NOROLE&fldAcctBrn=NADESAR&l_dummy=&l_dummy=&l_dummy=&l_dummy=&l_dummy=&fldFormatType=X`
                console.log('body2: ', body2)
                // let body = `fldAppId=RS&fldTxnId=SIN&fldScrnSeqNbr=02&fldSessionId=${fldSessionId.value}&fldRequestId=${fldRequestId.value}&fldAcctNo=${acc}&fldTxnType=A&fldNbrStmt=20&fldAccType=&fldAccBranch=&fldFromDate=${today}&fldToDate=${today}&selAccttype=SCA&selAcct=${acc}&radTxnType=C&cmbTxnType=A&cmbNbrStmt=20`
                fetch('https://netbanking.hdfcbank.com/netbanking/entry', {
                  headers: {
                    accept:
                      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'accept-language': 'zh,zh-CN;q=0.9,en;q=0.8,en-CA;q=0.7,ja-JP;q=0.6,ja;q=0.5',
                    'cache-control': 'max-age=0',
                    'content-type': 'application/x-www-form-urlencoded',
                    'sec-ch-ua': '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'sec-fetch-dest': 'frame',
                    'sec-fetch-mode': 'navigate',
                    'sec-fetch-site': 'same-origin',
                    'sec-fetch-user': '?1',
                    'upgrade-insecure-requests': '1',
                  },
                  referrer: 'https://netbanking.hdfcbank.com/netbanking/entry',
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
                    console.log('res: ', res)
                    // blob对象
                    const a = document.createElement('a')
                    const body: any = document.querySelector('frameset')
                    // 这里注意添加需要下载的文件后缀；
                    a.download = 'hdfcOld.xls'
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
                      request()
                    }, ruleForm.intervalTime * 1000 || 20000)
                    cutDownNumTimer = setInterval(() => {
                      cutDownNum.value--
                      if (cutDownNum.value < 0) {
                        clearInterval(cutDownNumTimer)
                      }
                    }, 1000)
                  })
                  .catch((err) => {
                    console.log('err: ', err)
                  })
              }
            })
            .catch((err) => {})
        })
        .catch((err) => {})
    }

    const download = async () => {
      if (!props.onOff) return

      let accountStatementForm1 =
        document.querySelector('frame[name="main_part"]') &&
        (
          document.querySelector('frame[name="main_part"]') as any
        ).contentWindow.document.querySelector('select[name="selAccttype"]')
      if (!accountStatementForm1) {
        setSyncStorage({ onOff: false })
        ctx.emit('onOffHandle', false)
        return
      }

      await sleep(1500)

      // 选择账号类型
      let selAccttype =
        document.querySelector('frame[name="main_part"]') &&
        (
          document.querySelector('frame[name="main_part"]') as any
        ).contentWindow.document.querySelector('select[name="selAccttype"]')
      if (selAccttype) {
        selAccttype.value = 'SCA'
        selAccttype.dispatchEvent(new Event('change'))
      }

      // 选择账号
      let selAcct = (
        document.querySelector('frame[name="main_part"]') as any
      ).contentWindow.document.querySelector('select[name="selAcct"]')
      if (selAcct) {
        let options = selAcct.querySelectorAll('option')
        selAcct.value = options[1]['value']
        selAcct.dispatchEvent(new Event('change'))
        await sleep(1000)
      }

      let radTxnType = (
        document.querySelector('frame[name="main_part"]') as any
      ).contentWindow.document.querySelectorAll('input[name="radTxnType"]')
      if (radTxnType) {
        radTxnType[1].click()
        await sleep(1000)
        // selAcct.dispatchEvent(new Event('click'))
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
      let frmDatePicker = (
        document.querySelector('frame[name="main_part"]') as any
      ).contentWindow.document.querySelector('input#frmDatePicker')
      if (frmDatePicker) {
        frmDatePicker.value = today
        await sleep(1000)
      }
      let toDatePicker = (
        document.querySelector('frame[name="main_part"]') as any
      ).contentWindow.document.querySelector('input#toDatePicker')
      if (toDatePicker) {
        toDatePicker.value = today
        await sleep(1000)
      }
      let viewBtn = (
        document.querySelector('frame[name="main_part"]') as any
      ).contentWindow.document.querySelector('a.viewBtn')
      if (viewBtn) {
        viewBtn.click()
        await sleep(1000)
      }

      // 检查下载按钮是否出现
      checkDownBtnTimer = setInterval(async () => {
        let download_stmt = (
          document.querySelector('frame[name="main_part"]') as any
        ).contentWindow.document.querySelector('a[onclick="return download_stmt();"]')
        if (download_stmt) {
          clearInterval(checkDownBtnTimer)
          let fldFormatType = (
            document.querySelector('frame[name="main_part"]') as any
          ).contentWindow.document.querySelector('select[name="fldFormatType"]')
          console.log('fldFormatType', fldFormatType)
          if (fldFormatType) {
            fldFormatType.value = 'X'
            fldFormatType.dispatchEvent(new Event('change'))
            await sleep(1000)
          }
          download_stmt.click()
          await sleep(5000)
          let customSubmit = (
            document.querySelector('frame[name="main_part"]') as any
          ).contentWindow.document.querySelector('a[onclick="return customSubmit()"]')
          customSubmit.click()
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
        }
      }, 1000)
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
      let _subAccount: any = await getSyncStorage('subAccount')
      ruleForm.intervalTime = _intervalTime || 20
      ruleForm.reportUrl = _reportUrl || ''
      ruleForm.subAccount = _subAccount || ''
      cutDownNum.value = ruleForm.intervalTime

      setTimeout(() => {
        if (location.href === 'https://netbanking.hdfcbank.com/netbanking/entry') {
          console.log(document.querySelector('frame[name="left_menu"]'))
          if (document.querySelector('frame[name="left_menu"]')) {
            let left_menu_inputs = (
              document.querySelector('frame[name="left_menu"]') as any
            ).contentWindow.document.querySelectorAll('form[name="frmMenu"] input')
            let form: any = ''
            for (const item of left_menu_inputs) {
              // form[item.name] = item.value
              var name = item.name
              var value = item.value
              if (name === 'fldTxnId') {
                value = 'SIN'
              }
              form += `${name}=${value}&`
            }
            form1Params.value = form
            console.log('form1Params.value: ', form1Params.value)
          }
        }
      }, 3000)
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
