<template>
  <main id="kk-container">
    <Mini v-if="pageType === 'Mini'" :onOff="props.onOff" :data="props.data" @onOffHandle="onOffHandle" />
    <All v-if="pageType === 'Transactions'" :onOff="props.onOff" :data="props.data" @onOffHandle="onOffHandle"/>
  </main>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import All from './pnbComponents/all.vue'
import Mini from './pnbComponents/mini.vue'
export default defineComponent({
  components: { All,Mini },
  props: {
    onOff: Boolean,
    data: String,
  },
  emits: ['onOffHandle'],
  setup(props: any, ctx) {
    const pageType = ref('')

    const onOffHandle = (flag: any) => {
      ctx.emit('onOffHandle', flag)
    }

    // 与后台通信
    onMounted(async () => {
      // chrome.storage.sync.clear()
      let PgHeading = document.getElementById('PgHeading.Ra1.C2')
      if(PgHeading?.innerText === 'View Mini Statement'){
        pageType.value = 'Mini'
      }else{
        pageType.value = 'Transactions'
      }
    })


    let code = document.getElementById('HREF_AuthenticationFG.GENERATED_CAPTCHA_CODE')
    if(code?.innerText){
      let codeInput:any = document.querySelector('input[name="AuthenticationFG.ENTERED_CAPTCHA_CODE"]')
      if(codeInput){
        codeInput.value = code?.innerText
      }
    }

    return {
      pageType,
      onOffHandle,
      props
    }
  },
})
</script>

<style scoped>
.run-status {
  display: flex;
  justify-content: center;
}
#kk-container{
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
.demo-ruleForm{
  padding-right: 8px;
}
</style>
