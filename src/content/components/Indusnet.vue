<template>
  <main id="kk-container">
    <el-icon :size="24" color="#e6a23c" @click="helpHandle"><QuestionFilled /></el-icon>
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

    <el-dialog v-model="dialogHelpVisible" title="Tips" width="30%">
      <div>
        <strong>使用方法</strong>
        <ul style="padding: 0 20px">
          <li>1、点击开关即可开始自动下载流水操作</li>
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
      accNumber: '', //accNumber
    })
    const rules = reactive({
      intervalTime: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
      desc: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
    })

    watch(
      () => props.onOff,
      (newValue) => {
        setSyncStorage({ onOff: props.onOff })
        clearTimeout(timer)
        clearInterval(cutDownNumTimer)
        if (newValue) {
          let flag = checkNavPage()
          if (newValue && flag) {
            getBillHandle(flag)
          } else {
            ElMessage({
              message: '[启动失败]：先登录再操作.',
              type: 'error',
            })
            ctx.emit('onOffHandle', false)
          }
        }
      },
    )

    const checkNavPage = () => {
      let flag: any = false

      // 检测是否为流水页面
      let ls1: any = document.querySelectorAll('#Transaction[style="display: block;"] .tLink')
      if (ls1.length) {
        for (const iterator of ls1) {
          if (iterator.innerText.indexOf('Mini Statement') != -1) {
            flag = 'ministatement'
          }
        }
      }

      if (flag) return flag

      // 检测是否为流水页面父级菜单
      let ls2: any = document.querySelectorAll('#SavingsCurrentAccounts .tLinkz')
      if (ls2.length) {
        for (const iterator of ls2) {
          if (iterator.innerText.indexOf('Statement') != -1) {
            flag = 'statement'
          }
        }
      }

      if (flag) return flag

      // 检测是否为顶级菜单
      let ls3: any = document.querySelectorAll('.inBxL .tLink')
      if (ls3.length) {
        flag = 'top'
      }

      return flag
    }

    const getBillHandle = (flag: any) => {
      if (flag === 'ministatement') {
        console.log('流水界面')
        let ls = document.querySelectorAll('.bx02Bg[colspan="5"]')
        if (ls.length) {
          console.log('点击下载按钮')
          let xlsbtn: any = ls[2].querySelectorAll('a')
          xlsbtn[1].click()

          timer = setTimeout(() => {
            // let ls: any = document.querySelectorAll('#SavingsCurrentAccounts .tLinkz')
            // ls[0].click()

            // 比较奇趴，需要点击父级才能下载
            let ls: any = document.querySelectorAll('.inBxL .tLink')
            if(ls.length){
              ls[0].click()
            }

          }, ruleForm.intervalTime * 1000 || 30000)
          cutDownNumTimer = setInterval(() => {
            cutDownNum.value--
            if (cutDownNum.value < 0) {
              clearInterval(cutDownNumTimer)
            }
          }, 1000)
        }
      } else if (flag === 'statement') {
        let ls: any = document.querySelectorAll('#SavingsCurrentAccounts .tLinkz')
        if(ls.length){
          ls[0].click()
        }
        console.log('流水界面父级菜单')
      } else if (flag === 'top') {
        console.log('顶级菜单')
        let ls: any = document.querySelectorAll('.inBxL .tLink')
        if(ls.length){
          ls[0].click()
        }
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
      ctx.emit('onOffHandle', onOff)
      ruleForm.intervalTime = _intervalTime || 20
      ruleForm.reportUrl = _reportUrl || ''
      cutDownNum.value = ruleForm.intervalTime

      if (onOff) {
        let flag = checkNavPage()
        if (onOff && flag) {
          getBillHandle(flag)
        } else {
          ElMessage({
            message: '[启动失败]：先登录再操作.',
            type: 'error',
          })
        }
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
