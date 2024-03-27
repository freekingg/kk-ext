<template>
  <main id="kk-container">
    <div style="display: flex; align-items: center; width: 350px">
      <p style="font-size: 14px">登录状态下，点击开启即可</p>
    </div>
    <section class="run-status">
      <el-result icon="info" :title="onOff ? '运行中' + cutDownNum + 's' : '未启动'">
        <template #icon>
          <img :src="runGifSrc" v-if="onOff" style="width: 150px" />
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
        <el-form-item label="爬取间隔(s)" prop="intervalTime">
          <el-input type="number" v-model="ruleForm.intervalTime" />
        </el-form-item>
        <el-form-item label="目标页面" prop="targetUrl">
          <el-input v-model="ruleForm.targetUrl" />
        </el-form-item>
        <el-form-item label="上报接口" prop="reportUrl">
          <el-input v-model="ruleForm.reportUrl" type="text" :disabled="false" />
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
import { ElMessage, ElIcon } from 'element-plus'
import { QuestionFilled } from '@element-plus/icons-vue'
import useStorage from '../useStorage'
import { sleep, getQueryString, eventClick } from '../../utils/index'

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
    const cutDownNum = ref(180)
    const settingVisible = ref(false)
    const runGifSrc = ref(chrome.runtime.getURL('img/runing2.gif'))
    const state = reactive({
      currentTab: null,
    })

    const { setSyncStorage, getSyncStorage } = useStorage()

    const ruleFormRef = ref()
    const dialogHelpVisible = ref(false)

    let reportUrl = 'https://fourth-test-api.eur8888.com/admin/third/thirdparty/notify/ins/key'
    let targetUrl = 'https://www.instagram.com/majidbhutta1122/'

    const ruleForm = reactive({
      intervalTime: 300, //爬取间隔时间
      reportUrl: reportUrl, //上报接口地址
      targetUrl: targetUrl,
      name: 'Hello',
      data: {},
    })
    const rules = reactive({
      intervalTime: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
      desc: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
    })

    watch(
      () => props.onOff,
      (newValue) => {
        setSyncStorage({ onOff: newValue })
        if (newValue) {
          if (location.href !== ruleForm.targetUrl) {
            ElMessage({
              message: '[启动失败]：请确认目标页面是否正确.',
              type: 'error',
            })
            clearTimeout(timer)
            clearInterval(cutDownNumTimer)
            ctx.emit('onOffHandle', false)
            chrome.runtime.sendMessage(
              { action: 'fetchData', type: 'STOP_INS', data: { ...ruleForm } },
              function (response) {
                console.log(response)
              },
            )
          } else {
            ElMessage({
              message: '[任务执行成功].',
              type: 'success',
            })
            download()
            chrome.runtime.sendMessage(
              { action: 'fetchData', type: 'START_INS', data: { ...ruleForm } },
              function (response) {
                console.log(response)
              },
            )
          }
        } else {
          ElMessage({
            message: '[任务已经关闭].',
            type: 'info',
          })
          clearTimeout(timer)
          clearInterval(cutDownNumTimer)
          chrome.runtime.sendMessage(
              { action: 'fetchData', type: 'STOP_INS', data: { ...ruleForm } },
              function (response) {
                console.log(response)
              },
            )
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
      await sleep(3000)
      let Alink: any = document.querySelector('a[rel="me nofollow noopener noreferrer"]')
      let fetchKey: any = ''
      if (Alink) {
        try {
          console.log(Alink.href)
          console.log(decodeURIComponent(Alink.href))
          let params: any = getQueryString(decodeURIComponent(Alink.href))
          if (params.e) {
            fetchKey = params.e
          }
        } catch (error) {
          console.log('error: ', error)
        }
      } else {
        ElMessage({
          message: '[获取失败]：请确认目标页面是否正确或者联系开发者.',
          type: 'error',
        })
        setTimeout(() => {
          location.reload()
        }, 10000)
        return
      }

      // content.js
      chrome.runtime.sendMessage(
        { action: 'fetchData', type: 'FETCH_DATA', data: { ...ruleForm, fetchKey: fetchKey } },
        function (response) {
          console.log(response)

          // 重置
          clearTimeout(timer)
          clearInterval(cutDownNumTimer)
          cutDownNum.value = ruleForm.intervalTime
          cutDownNumTimer = setInterval(() => {
            cutDownNum.value--
            if (cutDownNum.value < 0) {
              clearInterval(cutDownNumTimer)
            }
          }, 1000)
        },
      )
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
      let _reportUrl: any = (await getSyncStorage('reportUrl')) || reportUrl
      let _targetUrl: any = (await getSyncStorage('targetUrl')) || targetUrl
      let onOff: any = (await getSyncStorage('onOff')) || false

      ruleForm.intervalTime = _intervalTime || 300
      ruleForm.reportUrl = _reportUrl || ''
      ruleForm.targetUrl = _targetUrl || ''

      if (onOff) {
        ctx.emit('onOffHandle', onOff)
      }
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
