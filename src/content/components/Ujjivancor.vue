<template>
  <main id="kk-container">
    <div style="display: flex; align-items: center; width: 350px; font-size: 14px; flex-wrap: wrap">
      <el-alert title="操作说明" type="info">
        <p>此网站支持后台下载流水</p>
        <p><strong>使用说明：</strong></p>
        <p style="color: red">1、登录后，在流水下载界面选择日期区间选择当天日期</p>
        <p style="color: red">2、点击下载CSV操作后，即可实现后台下载</p>
      </el-alert>
    </div>
    <section class="run-status">
      <el-result icon="info" :title="onOff ? '运行中' + cutDownNum + 's' : '未启动'">
        <template #icon>
          <img :src="runGifSrc" v-if="onOff" />
        </template>
        <!-- <template #sub-title>
          <img :src="runGifSrc" v-if="onOff">
        </template> -->
        <template #extra>
          <el-button type="primary" @click="settingVisibleHandle">配置</el-button>
          <!-- <el-button type="primary" @click="injectHandle">注入</el-button> -->
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
          <el-button  @click="resetForm()">重置</el-button>
        </el-form-item>
      </el-form>
    </section>
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
    const isINjected = ref(false)
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
        if (newValue) {
          let params = props.data ? JSON.parse(props.data) : {}
          console.log('params: ', params)
          if (!params || !params.jsonStr) {
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
          window.postMessage({ actionType: 'stopUjjivancor', data: '' }, '*')
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

    const resetForm = () => {
      window.postMessage({ actionType: 'resetUjjivancor', data: {} }, '*')
    }

    const download = () => {
      let params = props.data
      console.log('params: ', params)
      if (!params || !props.onOff) return
      let parseProps = JSON.parse(params)
      window.postMessage({ actionType: 'downloadUjjivancor', data: parseProps }, '*')

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
        let apzloader = document.querySelector('#apzloader')
        if(apzloader){
          if(!apzloader.classList.contains('dispnone'))
            apzloader.classList.add('dispnone')
          }
      }, 1000)
    }

    const settingVisibleHandle = () => {
      settingVisible.value = !settingVisible.value
    }

    const injectHandle = () => {
      var s = document.createElement('script')
      s.src = chrome.runtime.getURL('js/ujjivansfb.js')
      s.onload = function () {
        s.remove()
      }
      if (document.body || document.head) {
        ;(document.body || document.head).appendChild(s)
      }
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

      let check = setInterval(() => {
        let transSectionId_main_div = document.querySelector('#transSectionId_main_div')
        if (transSectionId_main_div && !transSectionId_main_div.classList.contains('dispnone')) {
          injectHandle()
          clearInterval(check)
          console.log('injectHandle')
        }
      }, 1000)
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
      injectHandle,
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
