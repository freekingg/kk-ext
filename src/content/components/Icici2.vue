<template>
  <main id="kk-container">
    <!-- <div style="display: flex; align-items: center; width: 350px">
      <el-icon :size="24" color="#e6a23c"><QuestionFilled /></el-icon>
      <p style="font-size: 14px; display: inline-block">
        此网站支持后台下载流水，需要流水界面进行一次下载
      </p>
    </div> -->
    <section class="run-status" v-if="onOff">
      <el-icon class="is-loading">
        <Loading />
      </el-icon>
    </section>
    <section v-if="settingVisible">
      <!-- <el-alert title="配置" type="info" center show-icon /> -->
      <el-form ref="ruleFormRef" :model="ruleForm" :rules="rules" class="demo-ruleForm" status-icon>
        <el-form-item label="账号" prop="account">
          <el-radio-group v-model="ruleForm.account" class="ml-4">
            <el-radio v-for="(item, index) in accounts" :key="index" :label="index">
              <div class="c1">
                <p>{{ item.account_no }}</p>
                <p>(余额:{{ item.balance_amount }})</p>
              </div>
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="受益人" prop="account">
          <el-radio-group v-model="ruleForm.display_name" class="ml-4" size="small">
            <el-radio
              border
              v-for="(item, index) in contacts"
              :key="index"
              :label="item.display_name"
            >
              <div class="c1">
                <p>{{ item.display_name }}</p>
              </div>
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="金额" prop="amount">
          <el-input type="number" v-model="ruleForm.amount" />
          <el-radio-group v-model="ruleForm.amount" class="ml-4" size="small">
            <el-radio border v-for="(item, index) in amounts" :key="index" :label="item.amount">
              <div class="c1">
                <p>{{ item.label }}</p>
              </div>
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="模式" prop="mode">
          <el-radio-group v-model="ruleForm.mode" class="ml-4" size="small">
            <el-radio border v-for="(item, index) in modes" :key="index" :label="item.label">
              <div class="c1">
                <p>{{ item.label }}</p>
              </div>
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" v-loading="loading" @click="transForPageHandle">执行</el-button>
          <!-- <el-button type="primary" @click="submitForm(ruleFormRef)">保存</el-button> -->
        </el-form-item>
      </el-form>
    </section>
    <!-- <div class="btn-area" style="display: flex; justify-content: center; margin-bottom: 10px">
      <el-button type="primary" @click="startHandle">下载流水</el-button>
      <el-button type="primary" @click="transForPageHandle">转账</el-button>
    </div> -->
  </main>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, reactive, toRefs, watch } from 'vue'
import { ElMessage, ElIcon } from 'element-plus'
import { QuestionFilled, Loading } from '@element-plus/icons-vue'
import useStorage from '../useStorage'
import { sleep, Timer, eventClick } from '../../utils/index'
import dayjs from 'dayjs'
import axios from 'axios'
let timer: any = null
let cutDownNumTimer: any = null
export default defineComponent({
  components: { QuestionFilled, ElIcon, Loading },
  props: {
    onOff: Boolean,
    data: String,
  },
  emits: ['onOffHandle'],
  setup(props: any, ctx) {
    const cutDownNum = ref(30)
    const settingVisible = ref(true)
    const runGifSrc = ref(chrome.runtime.getURL('img/runing.gif'))
    const state = reactive({
      currentTab: null,
    })

    const { setSyncStorage, getSyncStorage } = useStorage()

    const accounts: any = ref([])
    const contacts: any = ref([])
    const amounts: any = ref([
      { label: '5万', amount: 50000 },
      { label: '10万', amount: 100000 },
      { label: '20万', amount: 200000 },
      { label: '30万', amount: 300000 },
      { label: '40万', amount: 400000 },
      { label: '50万', amount: 500000 },
    ])
    const modes: any = ref([{ label: 'IMPS' }, { label: 'NEFT' }])

    const ruleFormRef = ref()
    const loading = ref(false)
    const ruleForm = reactive({
      intervalTime: 20, //爬取间隔时间
      reportUrl: '', //上报接口地址
      name: 'Hello',
      data: {},
      account: 0,
      mode: 'IMPS',
      amount: '',
      display_name: '',
    })
    const rules = reactive({
      intervalTime: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
      desc: [{ required: true, message: 'Please input ...', trigger: 'blur' }],
    })

    watch(
      () => props.data,
      async (newValue) => {
        let newProps = JSON.parse(newValue)
        console.log('newProps: ', newProps)
        if (newProps.type === 'getAccount') {
          console.log('请求参数已更新.可以进行下载了')
          setSyncStorage({ account: newProps })
          ElMessage({
            message: '请求参数已更新.可以进行下载了',
            type: 'success',
          })
        }
      },
    )

    watch(
      () => props.onOff,
      async (newValue) => {
        clearTimeout(timer)
        clearInterval(cutDownNumTimer)
        if (newValue) {
          let url = location.href
          if (
            url === 'https://app.bankonnect.co/fund-transfer' ||
            url === 'https://app.bankonnect.co/bulk-fund-transfer'
          ) {
            ElMessage({
              message: '[实时监控已开启].',
              type: 'success',
            })
            startHandle()
          } else {
            ElMessage({
              message: '[启动失败]：请在转账页面开始.',
              type: 'error',
            })
            ctx.emit('onOffHandle', false)
          }
        } else {
          ElMessage({
            message: '[实时监控已关闭].',
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

    const startHandle = async () => {
      timer = setInterval(() => {
        getAccounts()
      }, 3000)
    }
    const transForPageHandle = async () => {
      let checkSyrTimer: any = null
      clearInterval(checkSyrTimer)

      if (!ruleForm.display_name) {
        ElMessage({
          message: 'Please select a beneficiary',
          type: 'error',
        })
        return
      }

      if (!ruleForm.amount) {
        ElMessage({
          message: 'Please enter the amount',
          type: 'error',
        })
        return
      }

      loading.value = true

      setTimeout(() => {
        loading.value = false
      }, 3000)

      let url = location.href
      if (
        url === 'https://app.bankonnect.co/fund-transfer' ||
        url === 'https://app.bankonnect.co/bulk-fund-transfer'
      ) {
        // 选择账号
        let accountFiled: any = document.querySelector(
          'bank-select[formcontrolname="transfer_from"]>div mat-form-field>div>div',
        )
        if (accountFiled) {
          accountFiled.click()
          await sleep(500)
          let subAccounts: any = document.querySelectorAll(
            '.cdk-overlay-connected-position-bounding-box mat-option',
          )
          if (subAccounts.length) {
            subAccounts[0].click()

            // 选择受益人

            let shouyiren: any = document.querySelector('input[data-placeholder="Select Vendor"]')
            if (shouyiren.value) {
              let clearBtn: any = document.querySelector('button.clear-btn')
              eventClick(clearBtn)
            }
            let accountFiled: any = document.querySelector(
              'contact-select[formcontrolname="beneficiary_id"]>div mat-form-field .mat-form-field-flex .mat-form-field-infix',
            )
            eventClick(accountFiled)
            await sleep(500)
            let num = 0
            checkSyrTimer = setInterval(async () => {
              num++
              if (num > 10) {
                clearInterval(checkSyrTimer)
                return
              }
              let shouyirens: any = document.querySelectorAll('.cdk-overlay-pane mat-option')
              if (shouyirens.length) {
                clearInterval(checkSyrTimer)
                let target: any = null
                for (const iterator of shouyirens) {
                  let name: any = iterator.querySelector('.mat-option-text .main')
                  if (name) {
                    if (name.innerText.trim() === ruleForm.display_name.trim()) {
                      target = iterator
                    }
                  }
                }
                if (target) {
                  eventClick(target)
                  await sleep(1500)
                  let amountFiled: any = document.querySelector('input[formcontrolname="amount"]')
                  if (amountFiled) {
                    const eventOpts = { bubbles: true, view: window }
                    amountFiled.focus?.()
                    amountFiled.value = +ruleForm.amount
                    amountFiled.dispatchEvent(new Event('input'), eventOpts)
                    amountFiled.blur?.()

                    // 选择方式
                    let modeFiled: any = document.querySelector(
                      'mat-select[formcontrolname="transaction_types_id"]>div',
                    )
                    if (modeFiled) {
                      modeFiled.click()
                      await sleep(500)
                      let modes: any = document.querySelectorAll('.cdk-overlay-pane mat-option')
                      let target2: any = null
                      for (const iterator of modes) {
                        let name: any = iterator.querySelector('.mat-option-text')
                        if (name) {
                          if (name.innerText.trim() === ruleForm.mode.trim()) {
                            target2 = iterator
                          }
                        }
                      }
                      if (target2) {
                        eventClick(target2)
                        // 发送验证码
                        let btn: any = document.querySelector(
                          'button[appeventclick="PAYMENT_TAB.SEND_PAYMENTS_SELECTED"]',
                        )
                        if (btn.disabled === false) {
                          eventClick(btn)
                        }
                      }
                    }
                  }
                }
              }
            }, 1000)
          }
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

    const getAccounts = async () => {
      let account: any = await getSyncStorage('account')
      let currentUser = localStorage.getItem('currentUser')
      if (currentUser) {
        let user = JSON.parse(currentUser)
        axios({
          method: 'get',
          url: `https://v2-api.bankopen.co/connected_banking/banks?accounts_id=${account.accounts_id}&companies_id=${account.companies_id}`,
          headers: {
            authorization: `Bearer${user.token}`,
          },
        })
          .then((result) => {
            if (result.status === 200) {
              accounts.value = result.data.data.filter((item: any) => item.status === 'Active')
              if (accounts.value.length === 1) {
                ruleForm.account = 0
              }
            }
            getContacts()
          })
          .catch((err) => {
            console.log('err: ', err)
          })
      }
    }

    const getContacts = async () => {
      let account: any = await getSyncStorage('account')
      let currentUser = localStorage.getItem('currentUser')
      if (currentUser) {
        let user = JSON.parse(currentUser)
        axios({
          method: 'get',
          url: `https://v2-api.bankopen.co/contacts??accounts_id=${account.accounts_id}&companies_id=${account.companies_id}&sortBy=display_name&sortDir=asc&per_page=12`,
          headers: {
            authorization: `Bearer${user.token}`,
          },
        })
          .then((result) => {
            if (result.status === 200) {
              contacts.value = result.data.data
            }
            // getBalance()
          })
          .catch((err) => {
            console.log('err: ', err)
          })
      }
    }

    const getBalance = async () => {
      let account_no = ruleForm.account
      console.log('account_no: ', account_no)
      let account: any = await getSyncStorage('account')
      let currentUser = localStorage.getItem('currentUser')
      if (currentUser) {
        let user = JSON.parse(currentUser)
        let currentBank = accounts.value.find((item: any) => item.account_no === account_no)
        let url = `?partner_banks_id=${currentBank.partner_banks_id}&account_no=${account_no}&link_types_id=${currentBank.link_types_id}&accounts_id=${account.accounts_id}&companies_id=${account.companies_id}`
        axios({
          method: 'get',
          headers: {
            authorization: `Bearer${user.token}`,
          },
          url: `https://v2-api.bankopen.co/connected_banking/icici/balance${url}`,
        }).then((result) => {
          console.log('result: ', result)
        })
      }
    }

    // 与后台通信
    onMounted(async () => {
      let _intervalTime: number = await getSyncStorage('intervalTime')
      let _reportUrl: any = await getSyncStorage('reportUrl')
      ruleForm.intervalTime = _intervalTime || 30
      ruleForm.reportUrl = _reportUrl || ''

      setTimeout(() => {
        getAccounts()
      }, 1500)
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
      startHandle,
      transForPageHandle,
      injectHandle,
      ...toRefs(state),
      accounts,
      contacts,
      amounts,
      modes,
      loading,
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
  max-width: 420px;
  max-height: 70vh;
  overflow: auto;
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
.c1 p {
  margin: 0 !important;
  margin-bottom: 0 !important;
  padding-bottom: 0 !important;
  line-height: 20px !important;
}
.el-radio {
  margin-right: 5px !important;
  margin-bottom: 5px !important;
  padding-left: 0 !important;
}
</style>
