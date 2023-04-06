<template>
  <div id="kk-container">
    <div style="width: 350px">
      <p style="font-size: 14px">此网站支持接口下载流水 <br /></p>
      <br />
      <p style="font-size: 14px; color: red">一定要手动下载一次流水 <br /></p>
      <p style="font-size: 13px;">1、进入 Account Services - Account Statement - view  <br /></p>
      <p style="font-size: 13px;">2、点击 Download 一次  <br /></p>
      <p style="font-size: 13px;">3、打开开关即可  <br /></p>
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
    <section v-if="settingVisible">
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
        if (newProps.type === 'updateAuParms') {
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
          ctx.emit('onOffHandle', false)
        }
      },
    )

    watch(
      () => props.onOff,
      async (newValue) => {
        let au = localStorage.getItem('au')
        clearTimeout(timer)
        clearInterval(cutDownNumTimer)
        clearInterval(delayTimer)
        if (newValue) {
          if (au) {
            // 构造数据
            const cEvt = new CustomEvent('auEvent', {
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
          const cEvt = new CustomEvent('auEvent', {
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
          const cEvt = new CustomEvent('auEvent', {
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
          const cEvt = new CustomEvent('auEvent', {
            detail: {
              type: 'stop',
              data: toRaw(ruleForm),
            },
          })
          document.dispatchEvent(cEvt)
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
      localStorage.setItem('au','')
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
