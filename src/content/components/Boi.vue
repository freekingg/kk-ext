<template>
  <main id="kk-container">
    <div style="display: flex; align-items: center; width: 350px">
      <el-icon :size="24" color="#e6a23c"><QuestionFilled /></el-icon>
      <p style="font-size: 14px; display: inline-block">
        此网站不支持后台下载流水，登录成功后，在转帐界面，点击开关即可自动下载
      </p>
    </div>
    <section class="run-status">
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
        clearTimeout(timer2)
        clearTimeout(timer3)
        clearInterval(cutDownNumTimer)
        if (newValue) {
          let flag = checkNavPage()
          // console.log('flag: ', flag);
          if (newValue) {
            // ElMessage({
            //   message: '.',
            //   type: 'error',
            // })
            console.log(2)
          } else {
            ElMessage({
              message: '[启动失败]：先登录再操作.',
              type: 'error',
            })
            clearTimeout(timer)
            clearTimeout(timer2)
            clearTimeout(timer3)
            clearInterval(cutDownNumTimer)
            ctx.emit('onOffHandle', false)
          }
        }
      },
    )

    const checkNavPage = async () => {
      let flag: any = false

      let xiazai: any = document.querySelector('input[value="Save As Text Format"]')
      // 当前在下载页面 下载完成
      if (xiazai) {
        await setSyncStorage({ step: 'wancheng' })
        xiazai.click()

        timer = setTimeout(async () => {
          let onOff: any = (await getSyncStorage('onOff')) || false
          let top: any = document.querySelector('.firstRow .MenuLine1 a')
          if (top && onOff) {
            clearInterval(cutDownNumTimer)
            cutDownNum.value = 30
            top.click()
          }
        }, 30000)
        // cutDownNumTimer = setInterval(async () => {
        //   let onOff: any = (await getSyncStorage('onOff')) || false
        //   if(!onOff){
        //     clearInterval(cutDownNumTimer)
        //     cutDownNum.value = 30
        //   }
        //   cutDownNum.value--
        //   console.log('cutDownNum.value: ', cutDownNum.value);
        //   if (cutDownNum.value < 0) {
        //     clearInterval(cutDownNumTimer)
        //   }
        // }, 1000)

        return 'wancheng'
      }

      let shijianinput: any = document.querySelector('input[name="txnSrcFromDate"]')
      // 当前在时间选择界面
      if (shijianinput) {
        // 当前在时间选择界面
        await setSyncStorage({ step: 'xuanzeshijian' })
        let shijianinput2: any = document.querySelector('input[name="txnSrcToDate"]')

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
        let today = `${myMonth}/${myToday}/${myYear}`
        shijianinput.value = today
        shijianinput2.value = today

        // 选择下载格式
        let xiazaigeshi: any = document.querySelector('input[value="1"]')
        xiazaigeshi.click()

        // 点击查询按钮
        let chaxun: any = document.querySelector(
          'input[name="Action.Accounts.QuerySelection.QueryStatement"]',
        )
        chaxun.click()
        return 'dianjichaxun'
      }

      // 当前在帐号类型选择界面
      let sel: any = document.querySelector(
        'form[name="AccountsSidemenu"] select[name="Options.SelectList"]',
      )
      if (sel && sel.value === 'Option.Accounts.QuerySelection') {
        sel.value = 'Option.Accounts.QuerySelection'
        let nav3: any = document.querySelector(
          'form[name="AccountsSidemenu"] input[name="Action.Go"]',
        )
        await setSyncStorage({ step: 'xuanzezhanghaochangxunleixing' })
        nav3.click()
        return
      }

      let currentAccount2: any = document.querySelector('#OperativeAC font b')
      // 当前在点击currentaccount 导航界面
      if (currentAccount2 && currentAccount2.innerText === 'Savings Accounts >>') {
        let nav2: any = document.querySelector('#OperativeAC .Line1 a')
        await setSyncStorage({ step: 'xuanzezhanghao2' })
        nav2.click()
        return
      }

      let currentAccount: any = document.querySelector('#OperativeAC font b')
      // 当前在点击currentaccount 导航界面
      if (currentAccount && currentAccount.innerText === 'Current Accounts >>') {
        let nav2: any = document.querySelector('#OperativeAC .Line1 a')
        await setSyncStorage({ step: 'xuanzezhanghao' })
        sel.value = 'Option.Accounts.QuerySelection'
        let nav3: any = document.querySelector(
          'form[name="AccountsSidemenu"] input[name="Action.Go"]',
        )
        await setSyncStorage({ step: 'xuanzezhanghaochangxunleixing' })
        nav3.click()
      }

      let top: any = document.querySelector('.firstRow .MenuLine1 a')
      if (top && top.innerText === 'खाता / Accounts') {
        top.click()
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
      let step: any = (await getSyncStorage('step')) || 0
      ctx.emit('onOffHandle', onOff)
      ruleForm.intervalTime = _intervalTime || 30
      ruleForm.reportUrl = _reportUrl || ''
      cutDownNum.value = ruleForm.intervalTime

      if (onOff) {
        let flag = checkNavPage()
        console.log('flag: ', flag)
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
