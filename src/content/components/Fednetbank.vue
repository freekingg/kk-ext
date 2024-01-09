<template>
  <main id="kk-container">
    <div style="display: flex; align-items: center; width: 350px; font-size: 14px; flex-wrap: wrap">
      <el-alert title="操作说明" type="info">
        <p>此网站可以多开窗口操作</p>
        <p><strong>使用说明：</strong></p>
        <p style="color: red">1、先登录进行流水界面，点击开始，用这个窗口进行下载流水</p>
        <p style="color: red">2、再新开一个窗口，重新登录进去，用这个窗口进行转账操作即可</p>
        <p style="color: blue">下载模式：当前页面是指不需要跳转到其它页面下载的</p>
      </el-alert>
    </div>
    <section class="run-status">
      <!-- <img :src="runGifSrc"> -->
      <el-result icon="info" :title="onOff ? '运行中' + cutDownNum + 's' : '未启动'">
        <template #icon>
          <img :src="runGifSrc" v-if="onOff" />
        </template>
        <template #extra>
          <el-button type="primary" @click="settingVisibleHandle">配置</el-button>
        </template>
      </el-result>
    </section>
    <section v-if="settingVisible">
      <el-form
        ref="ruleFormRef"
        :model="ruleForm"
        :rules="rules"
        label-width="120px"
        class="demo-ruleForm"
        status-icon
      >
        <el-form-item label="下载模式">
          <el-radio-group v-model="ruleForm.downloadMode">
            <el-radio :label="1">当前页面</el-radio>
            <el-radio :label="2">跳转页面</el-radio>
          </el-radio-group>
        </el-form-item>
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
          <li>1、在Accounts标签下，点击开关即可开始自动下载流水操作</li>
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
import { defineComponent, ref, onMounted, reactive, toRefs, watch } from 'vue'
import { ElMessage, ElIcon } from 'element-plus'
import { QuestionFilled } from '@element-plus/icons-vue'
import useStorage from '../useStorage'
import { eventClick, sleep } from '../../utils/index'
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
    const runGifSrc = ref(chrome.runtime.getURL('img/runing.gif'))
    const state = reactive({
      currentTab: null,
    })

    const { setSyncStorage, getSyncStorage } = useStorage()

    const ruleFormRef = ref()
    const dialogHelpVisible = ref(false)
    const step = ref(0)

    const ruleForm = reactive({
      intervalTime: 20, //爬取间隔时间
      reportUrl: '', //上报接口地址
      name: 'Hello',
      data: {},
      downloadMode: 1,
      accNumber: '', //accNumber
    })
    const rules = reactive({
      intervalTime: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
      desc: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
    })

    watch(
      () => props.onOff,
      async (newValue) => {
        let downloadMode: any = await getSyncStorage('downloadMode')
        if (downloadMode === 1) {
          let page1select: any = document.getElementById('s2id_TransactionHistoryFG.OUTFORMAT')
          if (page1select) {
            checkNavPage1()
          } else {
            ElMessage({
              message: '[启动失败]：请在流水界面操作.如果已经在流水界面，请先点击一次search按钮再开始',
              type: 'error',
            })
            ctx.emit('onOffHandle', false)
          }
        } else {
          if (location.pathname !== '/prod/statementnew/') {
            ElMessage({
              message: '[启动失败]：请在流水界面操作.',
              type: 'error',
            })
            ctx.emit('onOffHandle', false)
          }
          if (newValue) {
            let flag = checkNavPage()
          }
        }

        setSyncStorage({ onOff: props.onOff })
        clearTimeout(timer)
        clearTimeout(timer2)
        clearTimeout(timer3)
        clearInterval(cutDownNumTimer)
      },
    )

    const checkNavPage1 = async () => {
      let flag: any = false
      let xiazai: any = document.getElementById('s2id_TransactionHistoryFG.OUTFORMAT')
      // 当前在下载页面 下载完成
      if (xiazai) {
        await sleep(2000)
        let s1: any = document.getElementById('s2id_TransactionHistoryFG.OUTFORMAT')
        let s2id_download_type: any = s1.querySelector('a')
        console.log('s2id_download_type: ', s2id_download_type)
        eventClick(s2id_download_type)
        await sleep(3000)
        let drows: any = document.querySelectorAll('#select2-drop li')
        if (drows.length) {
          eventClick(drows[3])
        }

        await sleep(1000)
        eventClick(document.querySelector('button[name="Action.GENERATE_REPORT"]'))
        timer = setTimeout(async () => {
          let onOff: any = (await getSyncStorage('onOff')) || false
          let ActionButton: any = document.querySelector('button[name="Action.SEARCH"]')
          if (ActionButton && onOff) {
            clearInterval(cutDownNumTimer)
            cutDownNum.value = ruleForm.intervalTime

            let shijianinput: any = document.querySelector(
              'input[name="TransactionHistoryFG.FROM_TXN_DATE"]',
            )
            // 当前在时间选择界面
            if (shijianinput) {
              // 当前在时间选择界面
              await setSyncStorage({ step: 'xuanzeshijian' })
              let shijianinput2: any = document.querySelector(
                'input[name="TransactionHistoryFG.TO_TXN_DATE"]',
              )

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
              shijianinput.value = today
              shijianinput2.value = today
            }
            ActionButton.click()
          }
        }, ruleForm.intervalTime * 1000 || 20000)
        cutDownNumTimer = setInterval(() => {
          cutDownNum.value--
          if (cutDownNum.value < 0) {
            clearInterval(cutDownNumTimer)
          }
        }, 1000)
        return 'wancheng'
      } else {
        timer = setTimeout(async () => {
          let onOff: any = (await getSyncStorage('onOff')) || false
          let ActionButton: any = document.querySelector('button[name="Action.SEARCH"]')
          clearInterval(cutDownNumTimer)
          if (ActionButton && onOff) {
            clearInterval(cutDownNumTimer)
            cutDownNum.value = ruleForm.intervalTime

            let shijianinput: any = document.querySelector('input[name="transaction_date_from"]')
            // 当前在时间选择界面
            if (shijianinput) {
              // 当前在时间选择界面
              await setSyncStorage({ step: 'xuanzeshijian' })
              let shijianinput2: any = document.querySelector('input[name="transaction_date_to"]')

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
              shijianinput.value = today
              shijianinput2.value = today
            }
            ActionButton.click()
          }
        }, ruleForm.intervalTime * 1000 || 20000)
        cutDownNumTimer = setInterval(() => {
          cutDownNum.value--
          if (cutDownNum.value < 0) {
            clearInterval(cutDownNumTimer)
          }
        }, 1000)
      }

      return flag
    }

    const checkNavPage = async () => {
      let flag: any = false

      let xiazai: any = document.querySelector('input[name="transaction_date_from"]')
      // 当前在下载页面 下载完成
      if (xiazai) {
        await setSyncStorage({ step: 'wancheng' })
        await sleep(2000)
        let s2id_download_type: any = document.querySelector('#s2id_download_type a')
        console.log('s2id_download_type: ', s2id_download_type)
        eventClick(s2id_download_type)
        await sleep(3000)
        let drows: any = document.querySelectorAll('#select2-drop li')
        if (drows.length) {
          eventClick(drows[2])
        }

        await sleep(1000)
        eventClick(document.querySelector('button[name="download_file_btn"]'))
        timer = setTimeout(async () => {
          let onOff: any = (await getSyncStorage('onOff')) || false
          let ActionButton: any = document.querySelector('button[name="ActionButton"]')
          if (ActionButton && onOff) {
            clearInterval(cutDownNumTimer)
            cutDownNum.value = ruleForm.intervalTime

            let shijianinput: any = document.querySelector('input[name="transaction_date_from"]')
            // 当前在时间选择界面
            if (shijianinput) {
              // 当前在时间选择界面
              await setSyncStorage({ step: 'xuanzeshijian' })
              let shijianinput2: any = document.querySelector('input[name="transaction_date_to"]')

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
              shijianinput.value = today
              shijianinput2.value = today
            }
            ActionButton.click()
          }
        }, ruleForm.intervalTime * 1000 || 20000)
        cutDownNumTimer = setInterval(() => {
          cutDownNum.value--
          if (cutDownNum.value < 0) {
            clearInterval(cutDownNumTimer)
          }
        }, 1000)
        return 'wancheng'
      } else {
        timer = setTimeout(async () => {
          let onOff: any = (await getSyncStorage('onOff')) || false
          let ActionButton: any = document.querySelector('button[name="ActionButton"]')
          if (ActionButton && onOff) {
            clearInterval(cutDownNumTimer)
            cutDownNum.value = ruleForm.intervalTime

            let shijianinput: any = document.querySelector('input[name="transaction_date_from"]')
            // 当前在时间选择界面
            if (shijianinput) {
              // 当前在时间选择界面
              await setSyncStorage({ step: 'xuanzeshijian' })
              let shijianinput2: any = document.querySelector('input[name="transaction_date_to"]')

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
              shijianinput.value = today
              shijianinput2.value = today
            }
            ActionButton.click()
          }
        }, ruleForm.intervalTime * 1000 || 20000)
        cutDownNumTimer = setInterval(() => {
          cutDownNum.value--
          if (cutDownNum.value < 0) {
            clearInterval(cutDownNumTimer)
          }
        }, 1000)
      }

      return flag
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
      let onOff: any = (await getSyncStorage('onOff')) || false
      let downloadMode: any = await getSyncStorage('downloadMode')
      console.log('downloadMode: ', downloadMode);

      ruleForm.downloadMode = downloadMode || 1
      ruleForm.intervalTime = _intervalTime || 30
      ruleForm.reportUrl = _reportUrl || ''
      cutDownNum.value = ruleForm.intervalTime

      if (downloadMode === 1 && onOff) {
        ctx.emit('onOffHandle', onOff)
        // checkNavPage1()
      } else {
        if (location.pathname === '/prod/statementnew/') {
          ctx.emit('onOffHandle', onOff)
        }
      }

      // if (onOff) {
      //   let flag = checkNavPage()
      //   console.log('flag: ', flag)
      // }
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
