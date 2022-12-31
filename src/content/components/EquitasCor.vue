<template>
  <div id="kk-container">
    <div style="display: flex; align-items: center; width: 350px">
      <el-icon :size="24" color="#e6a23c"><QuestionFilled /></el-icon>
      <p style="font-size: 14px; display: inline-block">此网站下载流水需要在流水界面 <br /></p>
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
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, reactive, toRefs, watch } from 'vue'
import { ElMessage, ElIcon } from 'element-plus'
import { QuestionFilled } from '@element-plus/icons-vue'
import useStorage from '../useStorage'
import { sleep, Timer, eventClick } from '../../utils/index'
let timer: any = null
let timer1: any = null
let timer2: any = null
let timer3: any = null
let timer4: any = null
let timer5: any = null
let cutDownNumTimer: any = null
let checkDownCsvBtn: any = null
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
      async (newValue) => {
        clearTimeout(timer)
        clearInterval(cutDownNumTimer)
        clearInterval(timer1)
        clearInterval(timer2)
        clearInterval(timer3)
        clearInterval(timer4)
        clearInterval(timer5)
        if (newValue) {
          let nav1: any = document.querySelector('li#Dashboard_li')
          if (nav1) {
            download()
            ctx.emit('onOffHandle', true)
            return
          }
          ElMessage({
            message: '请先登录...',
            type: 'error',
          })
          ctx.emit('onOffHandle', false)
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

    const download = async () => {
      if (!props.onOff) return
      let nav1: any = document.querySelector('li#Dashboard_li')
      if (nav1) {
        nav1.click()
        timer1 = setInterval(async () => {
          let section_row_24_ul: any = document.querySelector('#section_row_24_ul')
          if (section_row_24_ul) {
            clearInterval(timer1)
            await sleep(2000)

            timer5 = setInterval(async () => {
              let section_column_30_li: any = document.querySelector('#section_column_30_li')
              if (section_column_30_li) {
                clearInterval(timer5)
                await sleep(2000)
                // section_column_30_li.click()
                eventClick(document.querySelector('#section_column_30_li'))
                await sleep(2000)
                timer4 = setInterval(async () => {
                  let acctList__accountno_0: any = document.querySelector('#acctList__accountno_0')
                  if (acctList__accountno_0) {
                    clearInterval(timer4)
                    await sleep(2000)
                    eventClick(document.querySelector('#acctList__accountno_0'))
                    timer2 = setInterval(async () => {
                      let element_button_1: any = document.querySelector('#element_button_1')
                      if (element_button_1) {
                        clearInterval(timer2)
                        await sleep(3000)
                        eventClick(document.querySelector('#element_button_1'))
                        timer3 = setInterval(async () => {
                          let report_duration_radio_option_today_lbl: any = document.querySelector(
                            '#report_duration_radio_option_today_lbl',
                          )
                          if (report_duration_radio_option_today_lbl) {
                            clearInterval(timer3)
                            eventClick(
                              document.querySelector('#report_duration_radio_option_today_lbl'),
                            )
                            await sleep(3000)
                            // let element_button_1: any = document.querySelector('#element_button_1')
                            // element_button_1.click()

                            let element_button_3: any = document.querySelector('#element_button_3')
                            element_button_3.click()
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
                    }, 1000)
                  }
                }, 1000)
              }
            }, 1000)
          }
        }, 1000)
      }
    }

    // 与后台通信
    onMounted(async () => {
      let _intervalTime: number = await getSyncStorage('intervalTime')
      let _reportUrl: any = await getSyncStorage('reportUrl')
      ruleForm.intervalTime = _intervalTime || 20
      ruleForm.reportUrl = _reportUrl || ''
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
