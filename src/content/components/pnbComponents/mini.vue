<template>
  <main id="kk-container">
    <div style="display: flex; align-items: center; width: 350px">
      <p style="font-size: 14px; display: inline-block">
        停留在当前页面，会自动下载最近10笔 <br />
      </p>
    </div>
    <section class="run-status">
      <!-- <img :src="runGifSrc"> -->
      <el-result icon="info" :title="onOff ? '运行中' + cutDownNum + 's' : '未启动'">
        <template #icon>
          <img :src="runGifSrc" style="width: 100px" v-if="onOff" />
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
        <el-form-item label="爬取间隔(s)" prop="intervalTimeMini">
          <el-input type="number" v-model="ruleForm.intervalTimeMini" />
        </el-form-item>
        <el-form-item label="账户下标" prop="indexMini">
          <el-input type="number" v-model="ruleForm.indexMini" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="submitForm(ruleFormRef)">保存</el-button>
        </el-form-item>
      </el-form>
    </section>
  </main>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, reactive, toRefs, watch, toRaw } from 'vue'
import { ElMessage, ElIcon } from 'element-plus'
import { QuestionFilled } from '@element-plus/icons-vue'
import useStorage from '../../useStorage'
let timer: any = null
let cutDownNumTimer: any = null
let checkDownTimer: any = null

export default defineComponent({
  components: { QuestionFilled, ElIcon },
  props: {
    onOff: Boolean,
    data: String,
  },
  emits: ['onOffHandle'],
  setup(props: any, ctx) {
    const cutDownNum = ref(10)
    const settingVisible = ref(false)
    const runGifSrc = ref(chrome.runtime.getURL('img/runing2.gif'))
    const state = reactive({
      currentTab: null,
    })

    const { setSyncStorage, getSyncStorage } = useStorage()

    const ruleFormRef = ref()

    const ruleForm: any = reactive({
      intervalTimeMini: 10, //爬取间隔时间
      data: {},
      indexMini: 1,
    })

    const rules = reactive({
      intervalTimeMini: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
      desc: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
    })

    watch(
      () => props.onOff,
      (newValue) => {
        clearTimeout(timer)
        clearInterval(cutDownNumTimer)
        clearInterval(checkDownTimer)
        setSyncStorage({ onOff: newValue })

        if (newValue) {
          if (!watchBillPage()) {
            ElMessage({
              message: '[启动失败]：请在流水界面执行开始.',
              type: 'error',
            })
            ctx.emit('onOffHandle', false)
            setSyncStorage({ onOff: false })
          } else {
            download()
          }
        } else if (!newValue) {
          setSyncStorage({ onOff: false })
          ctx.emit('onOffHandle', false)
          ElMessage({
            message: '[任务已经关闭].',
            type: 'info',
          })
        } else {
          setSyncStorage({ onOff: false })
          ElMessage({
            message: '[启动失败]：请在流水界面执行开始.',
            type: 'error',
          })
          ctx.emit('onOffHandle', false)
        }
      },
    )

    // 检查流水页面
    const watchBillPage = () => {
      let PgHeadingRa1C2: any = document.querySelector('#PgHeading .pageheadingcaps')
      if (PgHeadingRa1C2 && PgHeadingRa1C2.innerText == 'View Mini Statement') {
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

    const research = async () => {
      if (!props.onOff) return
      // 选择账户下标
      let account: any = document.querySelector(
        'select[name="OpMiniStatementFG.INITIATOR_ACCOUNT"]',
      )
      let accountOptions: any = account.querySelectorAll('option')
      account.value = accountOptions[+ruleForm.indexMini - 1]['value']
      console.log('账户下标', accountOptions[+ruleForm.indexMini - 1]['value'])

      setTimeout(async () => {
        // 点搜索按钮
        const searchBtn: any = document.getElementById('SEARCH')
        if (searchBtn) {
          searchBtn.click()
        }
      }, 1500)
    }

    const download = async () => {
      if (!props.onOff) return
      if (!watchBillPage()) {
        return
      }

      let errorlink1: any = document.getElementById('errorlink1')
      let dwt: any = document.querySelector('select[name="OpMiniStatementFG.OUTFORMAT"]')
      // 如果有下载图标则直接下载
      if (dwt || errorlink1) {
        dwt.value = 3
        let okButton: any = document.querySelector('input[name="Action.GENERATE_REPORT"]')
        if (okButton) {
          okButton.click()

          setTimeout(() => {
            // 重置
            clearTimeout(timer)
            clearInterval(cutDownNumTimer)
            cutDownNum.value = ruleForm.intervalTimeMini
            timer = setTimeout(() => {
              research()
            }, ruleForm.intervalTimeMini * 1000 || 10000)
            cutDownNumTimer = setInterval(() => {
              cutDownNum.value--
              if (cutDownNum.value < 0) {
                clearInterval(cutDownNumTimer)
              }
            }, 1000)
          }, 5000)
        }
      }
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
      // chrome.storage.sync.clear()

      let _intervalTime: number = await getSyncStorage('intervalTimeMini')
      console.log('_intervalTime: ', _intervalTime)
      let _index: number = await getSyncStorage('indexMini')

      let onOff: any = (await getSyncStorage('onOff')) || false
      if (onOff) {
        ctx.emit('onOffHandle', onOff)
      }

      ruleForm.intervalTimeMini = _intervalTime || 10
      ruleForm.indexMini = _index || 1
      cutDownNum.value = ruleForm.intervalTimeMini
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
#kk-container {
  max-height: 72vh;
  overflow: auto;
}
#kk-container :deep() .el-result {
  padding-top: 0;
  padding-bottom: 5px;
}
#kk-container :deep() .el-result__title {
  margin-top: 10px;
}
#kk-container :deep() .el-result__extra {
  margin-top: 10px;
}
.demo-ruleForm {
  padding-right: 8px;
}
</style>
