<template>
  <main id="kk-container">
    <div style="display: flex; align-items: center; width: 350px">
      <el-icon :size="24" color="#e6a23c" @click="helpHandle"><QuestionFilled /></el-icon>
      <p style="font-size: 14px; display: inline-block">
        -、此网站需要打开流水界面进行下载 <br />
        2、打开插件开关，此时会自动下载 <br />
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
          <li>1、进入流水界面，然后点击开始</li>
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
let checkDownTimer: any = null
let checkNavTimer:any = null

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
        clearTimeout(timer)
        clearInterval(cutDownNumTimer)
        clearInterval(checkDownTimer)
        clearInterval(checkNavTimer)

        if (newValue) {
          if (!watchBillPage()) {
            // ElMessage({
            //   message: '[启动失败]：请在流水界面执行开始.',
            //   type: 'error',
            // })
            // ctx.emit('onOffHandle', false)

            let nav:any = document.querySelectorAll('.nav-item-section> .ng-star-inserted')
            nav[2].querySelector('.nav-item-heading-content').click()

            let second_nav:any = document.querySelectorAll('li.setDefaultCursoe')
            second_nav[0].querySelector('.account-new-name').click()
            setTimeout(() => {
              checkNavTimer = setInterval(()=>{
                let knb2ContainerFrame: any = document.querySelector('iframe[name="knb2ContainerFrame"]')
                if (knb2ContainerFrame) {
                  let contentWindow = knb2ContainerFrame.contentWindow.document
                  let IdGo = contentWindow.querySelector('#IdGo')
                  if(IdGo){
                    clearInterval(checkNavTimer)
                    download()
                  }
                }
              },1000)
            }, 1000);


          } else {
            ElMessage({
              message: '[任务执行成功].',
              type: 'success',
            })
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
            message: '[启动失败]：请在流水界面执行开始 -2.',
            type: 'error',
          })
          ctx.emit('onOffHandle', false)
        }
      },
    )

    // 检查流水页面
    const watchBillPage = () => {
      let menu1: any = document.querySelector('.nav-item-active.nav-item-active-padding')
      if (menu1 && menu1.innerText == 'Statements') {
        let knb2ContainerFrame: any = document.querySelector('iframe[name="knb2ContainerFrame"]')
        if (knb2ContainerFrame) {
          let contentWindow = knb2ContainerFrame.contentWindow.document
          let searchBtns = contentWindow.querySelectorAll('#AllLinks .boxLinks')
          if (searchBtns) {
            return true
          }
        }
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

    const download = () => {
      if (!props.onOff) return
      if (!watchBillPage()) {
        ctx.emit('onOffHandle', false)
        return
      }

      let knb2ContainerFrame: any = document.querySelector('iframe[name="knb2ContainerFrame"]')
      if (knb2ContainerFrame) {
        let contentWindow = knb2ContainerFrame.contentWindow.document
        let searchBtns = contentWindow.querySelectorAll('#AllLinks .boxLinks')
        if (searchBtns.length) {
          
          let frmDt = contentWindow.querySelector('#frmDt')
          let toDt = contentWindow.querySelector('#toDt')
          let IdGo = contentWindow.querySelector('#IdGo')

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


          frmDt.value =`${myToday}/${myMonth}/${myYear}`
          // frmDt.value =`02/10/2022`
          toDt.value =`${myToday}/${myMonth}/${myYear}`
          // toDt.value =`02/10/2022`
          // let todayBtn: any = searchBtns[0]
            IdGo.click()
            clearInterval(checkDownTimer)
            checkDownTimer = setInterval(() => {
              let contentWindow = knb2ContainerFrame.contentWindow.document
              let selectList2 = contentWindow.querySelector('#selectList2')
              if (selectList2) {
                clearInterval(checkDownTimer)
                selectList2.value = 'Download To CSV'
                selectList2.dispatchEvent(new Event('change'))
                let downloadRpt = contentWindow.querySelector('#downloadRpt')
                console.log('downloadRpt: ', downloadRpt)
                setTimeout(() => {
                  downloadRpt.click()
                  selectList2.dispatchEvent(new Event('click'))
                }, 3000)
                setTimeout(() => {
                  // 重置
                  clearTimeout(timer)
                  clearInterval(cutDownNumTimer)
                  cutDownNum.value = ruleForm.intervalTime
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
        }else{
          console.log('网站出错，请重新从菜单进入.')
          ElMessage({
            message: '网站出错，请重新从菜单进入.',
            type: 'error',
          })

          // let menu1: any = document.querySelector('.nav-item-active.nav-item-active-padding')
          // console.log('menu: ', menu1, menu1.innerText)
          // let men1: any = document.querySelectorAll('.left-side-nav-bar .ng-star-inserted div')
          // console.log('men1: ', men1);
          // // men1[8].click()
          // men1[8].dispatchEvent(new Event('click'))
          // let second_nav:any = document.querySelectorAll('#second_nav .setDefaultCursoe')
          // second_nav[0].click()
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
