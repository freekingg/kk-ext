<template>
  <main id="kk-content">
    <el-card shadow="always" v-show="type !== 'Default'">
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
        <component :is="type" :onOff="onOff" :data="data" @onOffHandle="onOffHandle"></component>
      </div>
    </el-card>
  </main>
</template>
<script lang="ts">
import { defineComponent, ref, onMounted, reactive, toRefs } from 'vue'
import { ElIcon } from 'element-plus'
import { View } from '@element-plus/icons-vue'

import Default from './components/Default.vue'
import AxisbankPrime from './components/AxisbankPrime.vue'
import AxisbankIdx from './components/AxisbankIdx.vue'
import Indusnet from './components/Indusnet.vue'
import Pnbcor from './components/Pnbcor.vue'
import Iobp from './components/Iobp.vue'
import Bandhan from './components/Bandhan.vue'
import Jana from './components/Jana.vue'
import UtkarshCor from './components/UtkarshCor.vue'
import KVBcor from './components/KVBcor.vue'
import Canarabank from './components/Canarabank.vue'
import KotakCor from './components/KotakCor.vue'
import Ujjivancor from './components/Ujjivancor.vue'
import Boi from './components/Boi.vue'
import Esaf from './components/Esaf.vue'
import EquitasCor from './components/EquitasCor.vue'
import Freecharge from './components/Freecharge.vue'
import Amazon from './components/Amazon.vue'
import Bobi from './components/Bobi.vue'


import { ElMessage } from 'element-plus'
export default defineComponent({
  components: {
    Default,
    AxisbankPrime,
    AxisbankIdx,
    Indusnet,
    Pnbcor,
    Iobp,
    Bandhan,
    KVBcor,
    KotakCor,
    Jana,
    UtkarshCor,
    Canarabank,
    Ujjivancor,
    Boi,
    Esaf,
    EquitasCor,
    Freecharge,
    Amazon,
    Bobi,
    View,
    ElIcon,
  },
  setup() {
    const visible = ref(true)
    const state = reactive({
      host: '',
      type: 'Default',
      typeName: '',
      onOff: false,
      data: '',
    })

    // 网站配置
    const matchSite = [
      {
        type: 'AxisbankPrime',
        typeName: 'axis个户',
        matches: ['omni.axisbank.co.in', 'retail.axisbank.co.in'],
        injectJs: ['js/injected.js', 'js/vendor.1c9aa43f6bed1fff4f4b1656508073138.js'],
      },
      {
        type: 'AxisbankIdx',
        typeName: 'axis公户',
        matches: ['corporate.axisbank.co.in', 'idp.axisbank.co.in'],
        injectJs: ['js/injected.js'],
      },
      {
        type: 'Indusnet',
        typeName: 'Indusnet',
        matches: ['indusnet.indusind.com'],
      },
      {
        type: 'Pnbcor',
        typeName: 'PNBcor',
        matches: ['internetbanking.netpnb.com'],
        injectJs: ['js/injected.js'],
      },
      {
        type: 'Iobp',
        typeName: 'IOBp',
        matches: ['www.iobnet.co.in'],
      },
      {
        type: 'Bandhan',
        typeName: 'Bandhan',
        matches: ['corporate.bandhanbank.com'],
      },
      {
        type: 'Jana',
        typeName: 'Jana',
        matches: ['corporatebanking.janabank.com'],
      },
      {
        type: 'KVBcor',
        typeName: 'KVBcor',
        matches: ['www.kvbin.com'],
      },
      {
        type: 'KVBcor',
        typeName: 'KVBcor',
        matches: ['www.kvbin.com'],
      },
      {
        type: 'Canarabank',
        typeName: 'Canarabank',
        matches: ['netbanking.canarabank.in','online.canarabank.in'],
      },
      {
        type: 'Ujjivancor',
        typeName: 'Ujjivancor',
        matches: ['cib.ujjivansfb.in'],
      },
      {
        type: 'UtkarshCor',
        typeName: 'UtkarshCor',
        matches: ['corporatenetbanking.utkarsh.bank'],
      },
      {
        type: 'Boi',
        typeName: 'Boi',
        matches: ['starconnectcbs.bankofindia.com'],
      },
      {
        type: 'Esaf',
        typeName: 'Esaf Personal',
        matches: ['netbanking.esafbank.com'],
      },
      {
        type: 'EquitasCor',
        typeName: 'Equitas Cor',
        matches: ['inet.equitasbank.com'],
      },
      {
        type: 'Freecharge',
        typeName: 'freecharge',
        matches: ['www.freecharge.in'],
      },
      {
        type: 'Amazon',
        typeName: 'amazon',
        matches: ['www.amazon.in'],
      },
      {
        type: 'Bobi',
        typeName: 'bobi',
        matches: ['feba.bobibanking.com'],
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
      if (document.body || document.head) {
        ;(document.body || document.head).appendChild(s)
      }
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
      if (injectJs && injectJs.length) {
        for (const iterator of injectJs) {
          injectJsHandle(iterator)
        }
      }

      allowRightClick()
    }
    const toggleVisile = () => {
      visible.value = !visible.value
    }

    // 开启右键
    const allowRightClick = () => {
      window.addEventListener(
        'contextmenu',
        function (e) {
          e.stopPropagation()
        },
        true,
      )

      document.addEventListener(
        'contextmenu',
        function (e) {
          e.stopPropagation()
        },
        true,
      )
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
