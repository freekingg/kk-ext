<template>
  <main id="kk-content">
    <el-card shadow="always" v-show="type !== 'Default'">
      <template #header>
        <div class="card-header">
          <span>KK助手</span>
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
import AxisbankIdx from './components/AxisbankIdx.vue'
import Ins from './components/Ins.vue'
import { ElMessage } from 'element-plus'
export default defineComponent({
  components: {
    Default,
    Ins,
    AxisbankIdx,
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
        type: 'Ins',
        typeName: 'Ins助手',
        matches: ['www.instagram.com', 'instagram.com'],
      },
      {
        type: 'IciciBank2',
        typeName: 'IciciBank2 转账助手',
        matches: ['app.bankonnect.co'],
      },
    ]

    /**
     * 接收消息
     */
    const onMessage = (e: any) => {
      if (e.actionType) {
        console.log('content接收到了后台的消息', e)
        if (e.actionType === 'equitas') {
          state.data = JSON.stringify(e.data)
          return
        }
        state.data = JSON.stringify(e.data)
      }
    }

    const onOffHandle = (flag: any) => {
      state.onOff = flag
    }

    // 与后台通信
    onMounted(() => {
      state.host = location.host
      initHandle()
    })

    // inject injected script
    const injectJsHandle = (jspath: string, typeName: string) => {
      var s = document.createElement('script')
      s.src = chrome.runtime.getURL(jspath)
      s.onload = function () {
        // s.remove();
      }

      // if (document.body) {
      //   ;(document.body).appendChild(s)
      // }

        if (document.head) {
          document.head.appendChild(s)
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
          injectJsHandle(iterator, typeName)
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
