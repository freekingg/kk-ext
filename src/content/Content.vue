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
import AUBank from './components/AUBank.vue'
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
import BoiCor from './components/BoiCor.vue'
import Esaf from './components/Esaf.vue'
import EquitasCor from './components/EquitasCor.vue'
import Freecharge from './components/Freecharge.vue'
import Amazon from './components/Amazon.vue'
import Bobi from './components/Bobi.vue'
import Idbi from './components/Idbi.vue'
import Icici from './components/Icici.vue'
import IciciBank2 from './components/Icici2.vue'
import IdfcCor from './components/IdfcCor.vue'
import Msme from './components/Msme.vue'
import Paytm from './components/Paytm.vue'
import Hdfc from './components/Hdfc.vue'
import HdfcOld from './components/HdfcOld.vue'
import HdfcCor from './components/HdfcCor.vue'
import Shivalik from './components/shivalik.vue'
import Rblbank from './components/rblbank.vue'
import IndusnetCor from './components/IndusnetCor.vue'
import AUBankP from './components/AuBankP.vue'
import Fednetbank from './components/Fednetbank.vue'
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
    Fednetbank,
    Boi,
    BoiCor,
    Esaf,
    EquitasCor,
    Freecharge,
    Amazon,
    Bobi,
    Idbi,
    Icici,
    IciciBank2,
    IdfcCor,
    Msme,
    AUBank,
    AUBankP,
    Paytm,
    Shivalik,
    Hdfc,
    HdfcOld,
    HdfcCor,
    Rblbank,
    IndusnetCor,
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
        type: 'IndusnetCor',
        typeName: 'Indusnet Cor',
        matches: ['indusdirect.indusind.com'],
        injectJs: ['js/indus-cor.js'],
      },
      {
        type: 'Pnbcor',
        typeName: 'PNBcor',
        matches: [
          'internetbanking.netpnb.com',
          'internetbanking.pnbibanking.in',
          'internetbanking.pnbibanking.in',
        ],
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
        matches: ['netbanking.canarabank.in', 'online.canarabank.in'],
      },
      {
        type: 'Ujjivancor',
        typeName: 'Ujjivancor',
        matches: ['cib.ujjivansfb.in'],
        injectJs:['js/xlsx.full.min.js', ]
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
        type: 'BoiCor',
        typeName: 'BoiCor',
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
        injectJs: ['js/xlsx.full.min.js', 'js/EquitasCorp.js'],
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
      {
        type: 'Idbi',
        typeName: 'IDBI saving',
        matches: ['inet.idbibank.co.in', 'corp.idbibank.co.in'],
      },
      {
        type: 'Shivalik',
        typeName: 'shivalik',
        matches: ['shivalikinternetbanking.com'],
      },
      {
        type: 'Icici',
        typeName: 'Icici',
        matches: ['cibnext.icicibank.com'],
      },
      {
        type: 'IciciBank2',
        typeName: 'IciciBank2 转账助手',
        injectJs: ['js/icic2.js'],
        matches: ['app.bankonnect.co'],
      },
      {
        type: 'IdfcCor',
        typeName: 'Idfc Cor',
        matches: ['my.idfcfirstbank.com'],
        injectJs: ['js/idfc.js'],
      },
      {
        type: 'Msme',
        typeName: 'Msme',
        matches: ['yesmsmeonline.yesbank.in'],
      },
      {
        type: 'AUBank',
        typeName: 'AUBank',
        matches: ['cib.aubank.in', 'netbanking.aubank.in'],
        injectJs: ['js/xlsx.full.min.js', 'js/au.js'],
      },
      {
        type: 'AUBankP',
        typeName: 'AUBank Person',
        matches: ['netbanking.aubank.in'],
        injectJs: ['js/au-p.js'],
      },
      {
        type: 'Paytm',
        typeName: 'Paytm',
        injectJs: ['js/paytm.js'],
        matches: ['netbanking.paytmbank.com'],
      },
      {
        type: 'Hdfc',
        typeName: 'Hdfc',
        injectJs: ['js/feature-hdfc-common-utility.js'],
        matches: ['netportal.hdfcbank.com'],
      },
      {
        type: 'HdfcOld',
        typeName: 'HdfcOld',
        matches: ['netbanking.hdfcbank.com'],
      },
      {
        type: 'HdfcCor',
        typeName: 'HdfcCor',
        // injectJs: ['js/hdfcCorp.js','js/CT_ENCRYPTION.js'],
        injectJs: ['js/hdfcCorp.js'],
        matches: ['corporatebanking.hdfcbank.com'],
      },
      {
        type: 'Rblbank',
        typeName: 'RBL',
        matches: ['online.rblbank.com'],
      },
      {
        type:'Fednetbank',
        typeName: 'Fednetbank',
        matches: ['fednetbank.com','www.fednetbank.com'],
      }
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

        if (e.actionType === 'aubank') {
          state.data = JSON.stringify(e.data)
          return
        }

        if (e.actionType === 'icic2') {
          state.data = JSON.stringify(e.data)
          return
        }

        if (e.actionType === 'hdfc') {
          state.data = JSON.stringify(e.data)
          return
        }

        if (e.actionType === 'ujjivancorDownloadParams') {
          state.data = JSON.stringify(e.data)
          return
        }
        if (e.actionType === 'downloadUjjivancor' || e.actionType === 'resetUjjivancor' || e.actionType === 'stopUjjivancor' ) {
          return
        }

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
    const injectJsHandle = (jspath: string, typeName: string) => {
      var s = document.createElement('script')
      s.src = chrome.runtime.getURL(jspath)
      s.onload = function () {
        // s.remove();
      }

      // if (document.body) {
      //   ;(document.body).appendChild(s)
      // }

      if (typeName === 'Indusnet Cor') {
        if (document.head) {
          document.head.appendChild(s)
        }
          if (document.body || document.head) {
            ;(document.body || document.head).appendChild(s)
          }
      } else {
        if (document.head) {
          document.head.appendChild(s)
        }
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
