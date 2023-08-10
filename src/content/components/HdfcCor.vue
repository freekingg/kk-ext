<template>
  <main id="kk-container">
    <div style="display: flex; align-items: center; width: 350px">
      <el-icon :size="24" color="#e6a23c" @click="helpHandle"><QuestionFilled /></el-icon>
      <p style="font-size: 14px; display: inline-block; margin: 0">
        此网站支持不后台下载流水，需要停留在首页,直接点开始即可
      </p>
    </div>
    <section class="run-status">
      <!-- <img :src="runGifSrc"> -->
      <el-result icon="info" :title="onOff ? '运行中' + cutDownNum + 's' : '未启动'">
        <template #icon>
          <img :src="runGifSrc" v-if="onOff" style="width: 100px" />
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
        <!-- <el-form-item label="上报接口" prop="reportUrl">
          <el-input v-model="ruleForm.reportUrl" />
        </el-form-item>
        <el-form-item label="请求参数">
          <el-input v-model="data" type="textarea" disabled />
        </el-form-item> -->
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
import { defineComponent, ref, onMounted, reactive, toRefs, watch, toRaw } from 'vue'
import { ElMessage, ElIcon } from 'element-plus'
import { QuestionFilled } from '@element-plus/icons-vue'
import useStorage from '../useStorage'
import { writeFileXLSX, utils } from 'xlsx'
import { sleep, eventClick } from '../../utils/index'
let timer: any = null
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
    const cutDownNum = ref(30)
    const settingVisible = ref(false)
    const runGifSrc = ref(chrome.runtime.getURL('img/runing2.gif'))
    const state = reactive({
      currentTab: null,
    })

    const { setSyncStorage, getSyncStorage } = useStorage()

    const ruleFormRef = ref()
    const dialogHelpVisible = ref(false)
    const outEncryptValue = ref('')
    const reqBody = ref({})

    const ruleForm = reactive({
      intervalTime: 15, //爬取间隔时间
      reportUrl: '', //上报接口地址
      name: 'Hello',
      data: {},
      accNumber: '', //accNumber
    })
    const rules = reactive({
      intervalTime: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
      desc: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
    })

    // watch(
    //   () => props.data,
    //   async (newValue) => {
    //     let newProps = JSON.parse(newValue)
    //     if (newProps.type === 'hdfcList') {
    //       if (newProps.data.AccountStatementResModel?.miniTransactionDetailsDTOs) {
    //         downloadFile(newProps.data.AccountStatementResModel?.miniTransactionDetailsDTOs)
    //       }
    //     }

    //     if (newProps.type === 'updateHdfcOutEncryptValue') {
    //       if (newProps.outEncryptValue) {
    //         console.log('outEncryptValue: ', newProps.outEncryptValue)
    //         outEncryptValue.value = newProps.outEncryptValue
    //         setSyncStorage({ outEncryptValue: newProps.outEncryptValue })
    //       }
    //     }

    //     if (newProps.type === 'updateHdfcParms') {
    //       reqBody.value = newProps.data
    //       console.log('请求参数已更新.可以进行下载了')
    //       setSyncStorage({ reqBody: newProps.data })
    //       ElMessage({
    //         message: '请求参数已更新.可以进行下载了',
    //         type: 'success',
    //       })
    //     }
    //   },
    // )

    watch(
      () => props.onOff,
      async (newValue) => {
        clearTimeout(timer)
        clearInterval(cutDownNumTimer)
        clearInterval(checkDownCsvBtn)
        if (newValue) {
          setSyncStorage({ onOff: newValue })

          // return
          let downloadBtn: any = document.querySelector('.x-btn-Stmnt-dwnld button')
          // 如果有下载按钮，
          if (downloadBtn) {
            ElMessage({
              message: '[任务执行成功].',
              type: 'success',
            })
            // downloadForClick()
            checkCanvasHandle()
            return
          } else {
            ElMessage({
              message: '[请确认已经登录].',
              type: 'error',
            })
            setSyncStorage({ onOff: false })
            ctx.emit('onOffHandle', false)
            return
          }
        } else if (!newValue) {
          setSyncStorage({ onOff: false })
          ElMessage({
            message: '[任务已经关闭].',
            type: 'error',
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

    const downloadFile = async (list: any = []) => {
      // let newList = list.map((item: any) => {
      //   return {
      //     ...item,
      //     txnHistory: JSON.stringify(item.txnHistory),
      //   }
      // })
      if (!list.length) return
      const ws = utils.json_to_sheet(list)
      const wb = utils.book_new()
      utils.book_append_sheet(wb, ws, 'Data')
      writeFileXLSX(wb, 'hdfc.xlsx')
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

    const checkBlockOverlay = () => {
      let maxnum = 15
      return new Promise((resolve) => {
        let timer = setInterval(() => {
          maxnum--
          if (maxnum < 0) {
            clearInterval(timer)
            resolve(true)
          }
          let blockOverlay: any = document.querySelector('.x-mask-loading')
          if (!blockOverlay) {
            clearInterval(timer)
            resolve(true)
          } else if (blockOverlay && blockOverlay.style.display === 'none') {
            clearInterval(timer)
            resolve(true)
          }
        }, 1000)
      })
    }
    const downloadStmt = (id: any) => {
      const cEvt = new CustomEvent('hdfcCorEvent', {
        detail: {
          type: 'download',
          data: toRaw({
            ref_num: id,
          }),
        },
      })
      document.dispatchEvent(cEvt)
    }

    const downloadForClick = async () => {
      if (!props.onOff) return
      // let button: any = document.querySelector('.x-btn-Stmnt-dwnld button')
      let button: any = document.querySelector('a#LK_FETCH_BALANCES')
      
      if (button) {
        eventClick(button)
        await checkBlockOverlay()

        let stateLink: any = document.querySelector('a.x-gen-state-link')
        eventClick(stateLink)


        // let inputDom: any = document.querySelector('input[name="STMT_DATE_RANGE"]')

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
        var today = `${myToday}/${myMonth}/${myYear} - ${myToday}/${myMonth}/${myYear} `
        console.log('today: ', today)
        // '03/08/2023 - 10/08/2023'
        // inputDom.value = today

        // eventClick(button)
        // await checkBlockOverlay()
        // await sleep(1000)

        // 获取当前引用编号
        // let ReferenceNumberDom: any = document.querySelector('div[name="TXN_REF_NO_LBL"]')
        // let ReferenceNumber: any = ReferenceNumberDom.innerText

        // let buttons: any = document.querySelectorAll('.x-window-bbar button')
        // 生成其它
        // eventClick(buttons[1])
        // await sleep(1000)

        //  触发下拉
        await sleep(500)
        let statementInputs: any = document.querySelectorAll(
          '.form_statement_request input[autocomplete="off"]',
        )
        eventClick(statementInputs[1])
        await sleep(500)

        let listItem: any = document.querySelectorAll(
          '.x-layer.x-combo-list.x-resizable-pinned .x-combo-list-item',
        )
        eventClick(listItem[1])
        await sleep(500)

        let inputDom2: any = document.querySelector('input[name="STMT_DATE_RANGE"]')
        eventClick(inputDom2)
        await sleep(500)

        let tds: any = document.querySelectorAll('.calendar-table td.active')
        console.log('tds: ', tds);
        eventClick(tds[2])
        await sleep(500)
        let tds2: any = document.querySelectorAll('.calendar-table td.active')
        eventClick(tds2[0])
        // inputDom2.value = today
        await sleep(500)

        let applyBtn: any = document.querySelector('.drop-up.opensright.show-calendar .drp-buttons button.applyBtn')
        if(applyBtn.disabled){
          eventClick(tds[2])
        }else{
          eventClick(applyBtn)
        }
        await sleep(500)
        
        let buttons2: any = document.querySelectorAll('.x-window-bbar button')
        eventClick(buttons2[2])
        await checkBlockOverlay()
        await sleep(1000)

        // 关闭按钮
        let buttons3: any = document.querySelectorAll('.x-window-bbar button')
        
        let closeDom: any = document.querySelector('div.x-window-tc .x-tool-close')
        // buttons3[0].click()
        eventClick(closeDom)
        await sleep(1000)

        // 切换列表tab
        let menulayoutws_text_doms: any = document.querySelectorAll('.x-tab-strip-text')
        let nav_texts: any = Array.from(menulayoutws_text_doms).map((item: any) =>
          item.innerText.toLocaleLowerCase(),
        )
        let checkworkflow = nav_texts.includes('in workflow')
        if (checkworkflow) {
          let targetIndex = Array.from(menulayoutws_text_doms).findIndex(
            (item: any) => item.innerText.toLocaleLowerCase() === 'in workflow',
          )

          eventClick(menulayoutws_text_doms[targetIndex])
          await sleep(1000)
        }

        let checkworkbank = nav_texts.includes('sent to bank')
        if (checkworkbank) {
          let targetIndex = Array.from(menulayoutws_text_doms).findIndex(
            (item: any) => item.innerText.toLocaleLowerCase() === 'sent to bank',
          )
          eventClick(menulayoutws_text_doms[targetIndex])
          await sleep(1000)
        }

        let downloadLinks: any = document.querySelectorAll('a.x-download-link')
        if (downloadLinks.length) {
          // eventClick(downloadLinks[0])
          downloadStmt(downloadLinks[0]['id'])
        }

        // 重置
        clearTimeout(timer)
        clearInterval(cutDownNumTimer)
        cutDownNum.value = ruleForm.intervalTime
        timer = setTimeout(() => {
          downloadForClick()
        }, ruleForm.intervalTime * 1000 || 20000)
        cutDownNumTimer = setInterval(() => {
          cutDownNum.value--
          if (cutDownNum.value < 0) {
            clearInterval(cutDownNumTimer)
          }
        }, 1000)
      } else {
        // 重置
        clearTimeout(timer)
        clearInterval(cutDownNumTimer)
        cutDownNum.value = ruleForm.intervalTime
        timer = setTimeout(() => {
          downloadForClick()
        }, ruleForm.intervalTime * 1000 || 20000)
        cutDownNumTimer = setInterval(() => {
          cutDownNum.value--
          if (cutDownNum.value < 0) {
            clearInterval(cutDownNumTimer)
          }
        }, 1000)
      }
    }

    const customCanvas = async () => {
      // 点击导航展开
      let menu_layout_icon: any = document.querySelector('#menu_layout_icon')
      menu_layout_icon.click()

      // 检查是否存在自定义的画板菜单
      let menulayoutws_text_doms: any = document.querySelectorAll('.menulayoutwsicon_holder')
      let nav_texts: any = Array.from(menulayoutws_text_doms).map((item: any) =>
        item.innerText.toLocaleLowerCase(),
      )
      let checkCustom = nav_texts.includes('custom')
      if (checkCustom) {
        let targetIndex = Array.from(menulayoutws_text_doms).findIndex(
          (item: any) => item.innerText.toLocaleLowerCase() === 'custom',
        )
        eventClick(menulayoutws_text_doms[targetIndex])
        await checkBlockOverlay()
        // downloadForClick()
      } else {
        // 需要创建自定义画板

        // 点击自定义
        let targetIndex1 = Array.from(menulayoutws_text_doms).findIndex(
          (item: any) => item.innerText.toLocaleLowerCase() === 'design your canvas',
        )
        eventClick(menulayoutws_text_doms[targetIndex1])
        await checkBlockOverlay()

        // 自定义画板名称
        let canvasInput: any = document.querySelectorAll(
          '.x-form-element input.x-form-text.x-form-field[size="20"]',
        )
        canvasInput[1].value = 'custom'

        let widgetTitleDoms: any = document.querySelectorAll('.widgetTitle')
        console.log('widgetTitleDoms: ', widgetTitleDoms)

        // 添加转账
        let transferIndex = Array.from(widgetTitleDoms).findIndex(
          (item: any) => item.innerText.toLocaleLowerCase() === 'transfer funds',
        )
        console.log('添加转账: ', transferIndex)
        eventClick(widgetTitleDoms[transferIndex].nextSibling.children[0])
        await sleep(700)

        // 添加余额
        let balancesIndex = Array.from(widgetTitleDoms).findIndex(
          (item: any) => item.innerText.toLocaleLowerCase() === 'account balances',
        )
        console.log('添加余额: ', balancesIndex)
        eventClick(widgetTitleDoms[balancesIndex].nextSibling.children[0])
        await sleep(700)

        // 添加statement
        // let statementIndex = Array.from(widgetTitleDoms).findIndex(
        //   (item: any) => item.innerText.toLocaleLowerCase() === 'download statement',
        // )
        // console.log('添加statement: ', statementIndex)
        // eventClick(widgetTitleDoms[statementIndex].nextSibling.children[0])
        // await sleep(700)

        // 添加request
        let requestIndex = Array.from(widgetTitleDoms).findIndex(
          (item: any) => item.innerText.toLocaleLowerCase() === 'service request',
        )
        console.log('添加request: ', requestIndex)
        eventClick(widgetTitleDoms[requestIndex].nextSibling.children[0])
        await sleep(1000)

        // 点击创建
        let btns: any = document.querySelectorAll('.x-window-bbar button')
        eventClick(btns[0])
        await checkBlockOverlay()

        let btns2: any = document.querySelectorAll('.x-window-bbar button')
        eventClick(btns2[2])
      }
    }

    const checkCanvasHandle = (init = true) => {
      // dialogHelpVisible.value = true
      let timer: any = null
      timer = setInterval(() => {
        let workspacetitle: any = document.querySelector('.workspacetitle')
        if (workspacetitle) {
          clearInterval(timer)
          if (workspacetitle && workspacetitle.innerText === 'My Dashboard') {
            customCanvas()
            console.log('默认画板')
          } else if (workspacetitle && workspacetitle.innerText === 'custom') {
            if (init) {
              downloadForClick()
            }
            console.log('custom画板')
          } else {
            console.log('出错了，没有获取到画板名称')
          }
        }
      }, 1000)
    }

    // 与后台通信
    onMounted(async () => {
      // chrome.runtime.sendMessage({ type: "POPUP_INIT" }, async tab => {
      //   state.currentTab = await tab;
      // });
      let _intervalTime: number = await getSyncStorage('intervalTime')
      let _reportUrl: any = await getSyncStorage('reportUrl')
      ruleForm.intervalTime = _intervalTime || 20
      ruleForm.reportUrl = _reportUrl || ''
      cutDownNum.value = ruleForm.intervalTime

      reqBody.value = await getSyncStorage('reqBody')
      outEncryptValue.value = await getSyncStorage('outEncryptValue')

      setTimeout(() => {
        checkCanvasHandle(false)
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
