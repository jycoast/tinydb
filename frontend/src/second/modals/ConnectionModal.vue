<template>
  <FormProviderCore>
    <BasicModal
      @register="register"
      @cancel="handleCancelTest"
      @ok="handleSubmit"
      class="connectionModal"
      width="50%"
      title="Add connection">
      <TabControl isInline :tabs="tabs"/>
      <Alert
        v-if="errorMessage"
        type="error"
        :message="errorMessage"
        show-icon
        closable
        @close="errorMessage = ''"
        style="margin-bottom: 12px;"
      />
      <template #insertFooter>
        <a-button
          class="float-left"
          type="default"
          :loading="testing"
          @click="handleTest"
        >测试连接</a-button>
      </template>
    </BasicModal>
  </FormProviderCore>
</template>

<script lang="ts">
import {defineComponent, provide, unref, ref} from 'vue'
import {storeToRefs} from 'pinia'
import {pickBy} from 'lodash-es'
import {Alert, Tabs} from 'ant-design-vue'
import {BasicModal, useModalInner} from '/@/components/Modal'
import FormProviderCore from '/@/second/forms/FormProviderCore'
import TabControl from '/@/second/elements/TabControl.vue'
import ConnectionModalDriverFields from '/@/second/modals/ConnectionModalDriverFields.vue'
import ConnectionModalSshTunnelFields from '/@/second/modals/ConnectionModalSshTunnelFields.vue'
import ConnectionModalSslFields from '/@/second/modals/ConnectionModalSslFields.vue'
import {connectionTestApi, connectionSaveApi} from '/@/api/simpleApis'
import {useMessage} from '/@/hooks/web/useMessage'
import {useBootstrapStore} from "/@/store/modules/bootstrap"
const TabPane = Tabs.TabPane

export default defineComponent({
  name: 'ConnectionModal',
  components: {
    FormProviderCore,
    TabControl,
    BasicModal,
    [Tabs.name]: Tabs,
    [TabPane.name]: TabPane,
    [Alert.name]: Alert,
  },
  emits: ['register', 'closeCurrentModal'],
  setup(_, {emit}) {
    const [register, {closeModal, setModalProps}] = useModalInner()
    const {createMessage, notification} = useMessage()
    let connParams = {}
    const bootstrap = useBootstrapStore()
    const {connections} = storeToRefs(bootstrap)
    const errorMessage = ref('')
    const testing = ref(false)
    
    provide('dispatchConnections', (dynamicProps) => {
      connParams = dynamicProps
    })

    const handleTest = async () => {
      errorMessage.value = ''
      testing.value = true
      try {
        if (!window['go']) {
          const errMsg =
            '浏览器模式下无法测试连接：Wails 不会向浏览器注入 window.go。请使用项目根目录执行 `wails dev`（桌面模式）后再测试连接。'
          errorMessage.value = errMsg
          notification.error({
            message: '连接测试失败',
            description: errMsg,
            duration: 6,
          })
          return
        }

        const result = await connectionTestApi(pickBy(unref(connParams), (item) => !!item))
        // 检查是否有错误信息
        if (result && (result as any).errorMessage) {
          errorMessage.value = (result as any).errorMessage
          notification.error({
            message: '连接测试失败',
            description: (result as any).errorMessage,
            duration: 5,
          })
        } else {
          createMessage.success('连接测试成功！')
        }
      } catch (e: any) {
        const errMsg = e?.message || e?.toString() || '连接测试失败，请检查连接参数'
        errorMessage.value = errMsg
        notification.error({
          message: '连接测试失败',
          description: errMsg,
          duration: 5,
        })
        console.error('Connection test error:', e)
      } finally {
        testing.value = false
      }
    }

    const handleCancelTest = () => {
      errorMessage.value = ''
    }

    const handleSubmit = async () => {
      errorMessage.value = ''
      try {
        const result = await connectionSaveApi(pickBy(unref(connParams), (item) => !!item))
        // 检查是否有错误信息
        if (result && (result as any).errorMessage) {
          errorMessage.value = (result as any).errorMessage
          notification.error({
            message: '保存连接失败',
            description: (result as any).errorMessage,
            duration: 5,
          })
          return
        }
        void bootstrap.setConnections([...unref(connections), result])
        createMessage.success('连接保存成功！')
        emit('closeCurrentModal')
      } catch (e: any) {
        const errMsg = e?.message || e?.toString() || '保存连接失败，请检查连接参数'
        errorMessage.value = errMsg
        notification.error({
          message: '保存连接失败',
          description: errMsg,
          duration: 5,
        })
        console.error('Connection save error:', e)
      }
    }

    return {
      register,
      closeModal,
      handleTest,
      handleCancelTest,
      handleSubmit,
      errorMessage,
      testing,
      setModalProps: () => {
        //bodyStyle
        setModalProps({title: 'Modal New Title', bodyStyle: {padding: `0`}});
      },
      tabs: [
        {
          label: 'Main',
          component: ConnectionModalDriverFields
        },
        {
          label: 'SSH Tunnel',
          component: ConnectionModalSshTunnelFields,
        },
        {
          label: 'SSL',
          component: ConnectionModalSslFields
        },
      ],
      bodyStyle: {
        padding: `0`
      },
    }
  }
})
</script>

<style lang="less" scoped>
::v-deep(.scrollbar.scroll-container) {
  padding: 3px;
}
</style>
