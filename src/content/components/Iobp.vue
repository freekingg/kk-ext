<template>
  <main id="kk-container">
    <div style="display: flex; align-items: center; width: 350px">
      <el-icon :size="24" color="#e6a23c" @click="helpHandle"><QuestionFilled /></el-icon>
      <p style="font-size: 14px; display: inline-block; margin: 0">
        此网站支持不后台下载流水，需要停留在流水界面,直接点开始即可
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
    <div class="btn-area" style="display: flex; justify-content: center; margin-bottom: 10px">
      <el-button type="primary" @click="startHandle">下载流水</el-button>
      <el-button type="primary" @click="transForPageHandle">转账</el-button>
    </div>
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

    const query = () => {
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

      let accountNo: any = document.querySelector('#accountNo')
      if (accountNo) {
        let accountNoOption: any = accountNo.querySelectorAll('option')
        accountNo.value = accountNoOption[accountNoOption.length - 1].value
      }

      let fromDate: any = document.querySelector('#fromDate')
      if (fromDate) {
        fromDate.value = `${myMonth}/${myToday}/${myYear}`
      }
      let toDate: any = document.querySelector('#toDate')
      if (toDate) {
        toDate.value = `${myMonth}/${myToday}/${myYear}`
      }

      // 查询按钮
      let accountstatement_view: any = document.querySelector('#accountstatement_view')
      accountstatement_view.click()
    }

    watch(
      () => props.onOff,
      async (newValue) => {
        console.log('newValue: ', newValue)
        clearTimeout(timer)
        clearInterval(cutDownNumTimer)
        if (newValue) {
          setSyncStorage({ onOff: newValue })

          let mode: any = await getSyncStorage('mode')
          if (mode === 'download' && location.href.indexOf('menuname=Accounts') !== -1) {
            let lis: any = document.querySelectorAll('#collapsible li')
            if (lis.length) {
              lis[2].querySelector('a').click()
            }
            return
          }

          let accountstatement_csvAcctStmt = document.querySelector('#accountstatement_csvAcctStmt')
          // 如果有csv下载按钮，直接进行下载
          if (accountstatement_csvAcctStmt) {
            ElMessage({
              message: '[任务执行成功].',
              type: 'success',
            })
            download()
            return
          }

          let datagrid: any = document.querySelector('#datagrid')
          if (datagrid && datagrid.innerText.indexOf('Nothing found') !== -1) {
            cutdown()
            return
          }

          // 如果有表单，则自动填充
          let accountstatement: any = document.querySelector('#accountstatement')
          if (accountstatement) {
            query()
            return
          }

          if (
            location.href.indexOf('accountstatement.do?print=true') !== -1 &&
            !accountstatement_csvAcctStmt
          ) {
            ElMessage({
              message: '[启动失败]：请确认是否有流水',
              type: 'error',
            })
            ctx.emit('onOffHandle', false)
            setSyncStorage({ onOff: false })
            return
          }

          ElMessage({
            message: '[启动失败]：请确认是否在流水界面',
            type: 'error',
          })
          ctx.emit('onOffHandle', false)
          setSyncStorage({ onOff: false })
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

    const startHandle = async () => {
      setSyncStorage({ mode: 'download' })
      let main1: any = document.querySelector('#main1')
      if (main1) {
        setSyncStorage({ onOff: true })
        main1.querySelector('a').click()
      }
    }
    const transForPageHandle = async () => {
      let main2: any = document.querySelector('#main2')
      if (main2) {
        setSyncStorage({ mode: 'transer' })
        ctx.emit('onOffHandle', false)
        main2.querySelector('a').click()
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

    const cutdown = () => {
      // 重置
      clearTimeout(timer)
      clearInterval(cutDownNumTimer)
      cutDownNum.value = ruleForm.intervalTime
      timer = setTimeout(() => {
        query()
      }, ruleForm.intervalTime * 1000 || 20000)
      cutDownNumTimer = setInterval(() => {
        cutDownNum.value--
        if (cutDownNum.value < 0) {
          clearInterval(cutDownNumTimer)
        }
      }, 1000)
    }

    const download = async () => {
      if (!props.onOff) return

      let accountstatement_excelAcctStmt: any = document.querySelector(
        '#accountstatement_excelAcctStmt',
      )
      if (accountstatement_excelAcctStmt) {
        accountstatement_excelAcctStmt.click()
        cutdown()
      } else {
        ElMessage({
          message: '[失败]：请确认是否在流水界面.',
          type: 'error',
        })
        return
      }
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
      if (onOff) {
        ctx.emit('onOffHandle', onOff)
      }
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
      startHandle,
      transForPageHandle,
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
