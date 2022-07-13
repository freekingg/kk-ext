<script lang="ts">
import { defineComponent, ref, onMounted, reactive, toRefs } from 'vue'
export default defineComponent({
  setup() {
    const visible = ref(false)
    const state = reactive({
      currentTab: null,
    })

    /**
     * 接收消息
     */
    const onMessage = () => {
      // alert(action)
      // alert(category)
      console.log('content接收到了后台的消息')
    }



    // 与后台通信
    onMounted(() => {
      // chrome.runtime.sendMessage({ type: "POPUP_INIT" }, async tab => {
      //   state.currentTab = await tab;
      //   console.log(state.currentTab);
      // });
    });
    return {
      visible,
      onMessage,
      ...toRefs(state),
    }
  },
})
</script>

<template>
  <main id="kk-content">
    <el-card shadow="always">
      <template #header>
        <div class="card-header">
          <span>Card name</span>
          <el-button>Operation button</el-button>
        </div>
        <img src="../assets/logo.png" alt="">
      </template>
    </el-card>
  </main>
</template>

<style scoped>
#kk-content {
  min-width: 300px;
}
.card-header{
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
