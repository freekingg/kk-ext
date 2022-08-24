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
        <AxisbankPrime
          v-if="type === 'axisBankPrime'"
          :onOff="onOff"
          :data="data"
          @onOffHandle="onOffHandle"
        />

        <Indusnet
          v-if="type === 'indusnet'"
          :onOff="onOff"
          :data="data"
          @onOffHandle="onOffHandle"
        />

        <AxisbankIdx
          v-if="type === 'axisbankIdx'"
          :onOff="onOff"
          :data="data"
          @onOffHandle="onOffHandle"
        />

        <Iobp
          v-if="type === 'iobp'"
          :onOff="onOff"
          :data="data"
          @onOffHandle="onOffHandle"
        />

        <Pnbcor v-if="type === 'pnbcor'" :onOff="onOff" :data="data" @onOffHandle="onOffHandle" />
        <Bandhan v-if="type === 'bandhan'" :onOff="onOff" :data="data" @onOffHandle="onOffHandle" />
      </div>
    </el-card>
  </main>
</template>
<script lang="ts">
import { defineComponent, ref, onMounted, reactive, toRefs } from 'vue'
import { ElIcon } from 'element-plus'
import { View } from '@element-plus/icons-vue'

import AxisbankPrime from './components/AxisbankPrime.vue'
import AxisbankIdx from './components/AxisbankIdx.vue'
import Indusnet from './components/Indusnet.vue'
import Pnbcor from './components/Pnbcor.vue'
import Iobp from './components/Iobp.vue'
import Bandhan from './components/Bandhan.vue'

import { ElMessage } from 'element-plus'
export default defineComponent({
  components: { AxisbankPrime, AxisbankIdx, Indusnet, Pnbcor,Iobp,Bandhan, View, ElIcon },
  setup() {
    const visible = ref(true)
    const state = reactive({
      host: '',
      type: '',
      typeName: '',
      onOff: false,
      data: '',
    })

    // 网站配置 
    const matchSite = [
      {
        type: 'axisBankPrime',
        typeName: 'axis个户',
        matches: ['omni.axisbank.co.in', 'retail.axisbank.co.in'],
        injectJs: ['js/injected.js', 'js/vendor.1c9aa43f6bed1fff4f4b1656508073138.js'],
      },
      {
        type: 'axisbankIdx',
        typeName: 'axis公户',
        matches: ['corporate.axisbank.co.in', 'idp.axisbank.co.in'],
        injectJs: ['js/injected.js'],
      },
      {
        type: 'indusnet',
        typeName: 'Indusnet',
        matches: ['indusnet.indusind.com'],
      },
      {
        type: 'pnbcor',
        typeName: 'PNBcor',
        matches: ['internetbanking.netpnb.com'],
        injectJs: ['js/injected.js'],
      },
      {
        type: 'iobp',
        typeName: 'IOBp',
        matches: ['www.iobnet.co.in'],
      },
      {
        type: 'canara',
        typeName: 'Canara',
        matches: ['netbanking.canarabank.in'],
      },
      {
        type: 'bandhan',
        typeName: 'Bandhan',
        matches: ['corporate.bandhanbank.com'],
        // injectJs: ['js/injected.js'],
      },
    ]

    /**
     * 接收消息
     */
    const onMessage = (e: any) => {
      console.log('content接收到了后台的消息', e)
      if (e.actionType) {
        state.data = JSON.stringify(e.data)
        if (e.actionType) {
          ElMessage({
            message: '请求参数已更新.',
            type: 'success',
          })
        }
      }
    }

    const onOffHandle = (flag: any) => {
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

    // inject injected script
    const injectJsHandle = (jspath: string) => {
      var s = document.createElement('script')
      s.src = chrome.runtime.getURL(jspath)
      s.onload = function () {
        // s.remove();
      }
      ;(document.body || document.head).appendChild(s)
    }

    const initHandle = () => {
      const host = state.host

      let target: any = null
      for (const iterator of matchSite) {
        if (iterator.matches.includes(host)) {
          target = iterator
        }
      }
      console.log('target', target)
      if (!target) return
      const { type, typeName, injectJs } = target
      state.type = type
      state.typeName = typeName
      if(injectJs && injectJs.length){
        for (const iterator of injectJs) {
          injectJsHandle(iterator)
        }
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
