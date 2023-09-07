<template>
  <main id="kk-container">
    <div style="width: 350px">
      <p style="font-size: 14px; color: red; margin: 0">此网站支持接口下载流水 <br /></p>
      <p style="font-size: 14px; color: red; margin: 0">
        1、一定要在流水界面选择日期查询一次流水(Account Statement - custom) <br />
      </p>
      <p style="font-size: 13px; margin: 0">2、打开开关即可后台下载 <br /></p>
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
        <el-form-item label="下载数量" prop="size">
          <el-input type="number" v-model="ruleForm.size" />
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
    const cutDownNum = ref(30)
    const settingVisible = ref(false)
    const runGifSrc = ref(chrome.runtime.getURL('img/runing.gif'))
    const state = reactive({
      currentTab: null,
    })

    const { setSyncStorage, getSyncStorage } = useStorage()

    const ruleFormRef = ref()
    const dialogHelpVisible = ref(false)
    const dataForm = ref({})

    const ruleForm = reactive({
      intervalTime: 20, //爬取间隔时间
      reportUrl: '', //上报接口地址
      name: 'Hello',
      data: {},
      size: 10000,
    })
    const rules = reactive({
      intervalTime: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
      desc: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
    })

    watch(
      () => props.onOff,
      (newValue) => {
        clearTimeout(timer)
        clearTimeout(delayTimer)
        clearInterval(cutDownNumTimer)
        if (newValue) {
          let flag = checkNavPage()
          if (flag) {
            let aup = localStorage.getItem('aup')
            console.log('aup: ', aup)
            let params = {}
            if (aup) {
              params = JSON.parse(aup)
              dataForm.value = params
              downloadFile()
            } else {
              ctx.emit('onOffHandle', false)
            }
          } else {
            ElMessage({
              message: '[启动失败]：先登录后手动操作一次查询帐单再开启.',
              type: 'error',
            })
            clearTimeout(timer)
            clearInterval(cutDownNumTimer)
            ctx.emit('onOffHandle', false)
          }
        }
      },
    )

    const checkNavPage = () => {
      let xiazai: any = document.querySelector('button[aria-label="logout"]')
      let xiazai2: any = document.querySelector('img[title="logout"]')
      // 当前在下载页面 下载完成
      if (xiazai || xiazai2) {
        return true
      } else {
        return false
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

    const checkBlockOverlay = () => {
      let overlay: any = document.querySelector('.cdk-overlay-pane')
      if (overlay) {
        let overlayBtn: any = document.querySelector('.cdk-overlay-pane button.mat-raised-button')
        if (overlayBtn) {
          overlayBtn.click()
        }
      }
    }

    const downloadFile = () => {
      if (!props.onOff) return
      clearTimeout(delayTimer)
      const getMXHiddenParam = (s: any, _: any) => {
        const k = document.createElement('input')
        return (k.name = s), (k.value = _), k
      }
      const formElemSerialize = (s: any, _: any) => {
        Object.keys(s).forEach((k) => {
          if ('object' == typeof s[k]) {
            const B = s[k]
            null != B
              ? Object.keys(B).forEach((ze) => {
                  _.appendChild(getMXHiddenParam(ze, B[ze]))
                })
              : _.appendChild(getMXHiddenParam(k, ''))
          } else _.appendChild(getMXHiddenParam(k, s[k]))
        })
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
      let today = `${myYear}-${myMonth}-${myToday}`

      let params: any = dataForm.value
      var k: any = {
        InputParams: {
          startDate: `${today}T00:00:00+04:00`,
          endDate: `${today}T00:00:00+04:00`,
          txnCrDtInd: 'ALL',
          accountUuid: params.accountUuid,
          page: 0,
          size: ruleForm.size || 10000,
        },
        app: params.app || 'RB',
        mxrs: params.mxrs || '10103',
        rptformat: 'xls',
        ser: params.ser || 'ACTHREP',
      }

      const Yt = document.createElement('form')
      formElemSerialize(k, Yt)
      Yt.method = 'POST'
      Yt.action = 'https://netbanking.aubank.in/mib/servlets/report'
      document.body.appendChild(Yt)
      Yt.submit()
      document.body.removeChild(Yt)

      // 重置
      cutDownNum.value = ruleForm.intervalTime
      clearTimeout(timer)
      clearInterval(cutDownNumTimer)
      delayTimer = setTimeout(() => {
        timer = setTimeout(() => {
          downloadFile()
        }, ruleForm.intervalTime * 1000 || 20000)
        cutDownNumTimer = setInterval(() => {
          cutDownNum.value--
          if (cutDownNum.value < 0) {
            clearInterval(cutDownNumTimer)
          }
        }, 1000)
      }, 5000)
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
      let _size: number = await getSyncStorage('size')
      let onOff: any = (await getSyncStorage('onOff')) || false
      ctx.emit('onOffHandle', onOff)
      ruleForm.intervalTime = _intervalTime || 30
      ruleForm.size = _size || 10000
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
