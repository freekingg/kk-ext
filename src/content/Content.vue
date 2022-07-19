<template>
  <main id="kk-content">
    <el-card shadow="always" v-show="type">
      <template #header>
        <div class="card-header">
          <span>{{ typeName || '-' }}</span>
          <div class="right">
            <el-switch v-model="onOff" size="large" />
            <el-icon @click="toggleVisile"><View /></el-icon>
          </div>
        </div>
      </template>
      <div class="card-box" v-show="visible">
        <AxisbankPrime v-if="type === 'axisBankPrime'" :onOff="onOff"
        :data="data" @onOffHandle="onOffHandle" />
      </div>
    </el-card>
  </main>
</template>
<script lang="ts">
import { defineComponent, ref, onMounted, reactive, toRefs } from 'vue'
import { ElIcon } from 'element-plus'
import { View } from '@element-plus/icons-vue'

import AxisbankPrime from './components/AxisbankPrime.vue'
import { ElMessage } from 'element-plus'
export default defineComponent({
  components: { AxisbankPrime, View, ElIcon },
  setup() {
    const visible = ref(true)
    const state = reactive({
      host: '',
      type: '',
      typeName:'',
      onOff: false,
      data:null
    })

    /**
     * 接收消息
     */
    const onMessage = (e:any) => {
      console.log('content接收到了后台的消息',e)
      if(e.actionType){
        state.data = JSON.stringify(e.data)
        if(e.actionType){
          ElMessage({
            message: '请求参数已更新.',
            type: 'success',
          })
        }
        
      }
    }
    
    const onOffHandle = (flag:any) => {
      state.onOff = flag
    }

    // 与后台通信
    onMounted(() => {
      // chrome.runtime.sendMessage({ type: "POPUP_INIT" }, async tab => {
      //   state.currentTab = await tab;
      //   console.log(state.currentTab);
      // });
      state.host = location.host
      initHandle()
    })
    const initHandle = () => {
      switch (state.host) {
        case 'omni.axisbank.co.in':
          state.type = 'axisBankPrime'
          state.typeName = 'axis个户'
          break
        default:
          break
      }
    }
    const toggleVisile = () => {
      visible.value = !visible.value
    }
    return {
      visible,
      toggleVisile,
      onMessage,
      onOffHandle,
      ...toRefs(state),
    }
  },
})
</script>

<style scoped>
#kk-content {
  min-width: 350px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-header .right {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 76px;
}
</style>
