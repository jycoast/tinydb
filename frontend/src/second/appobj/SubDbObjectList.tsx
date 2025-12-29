import { computed, defineComponent, onBeforeUnmount, PropType, ref, toRefs, unref, watch } from 'vue'
import { sortBy } from 'lodash-es'
import AppObjectList from '/@/second/appobj/AppObjectList'
import DatabaseObjectAppObject from '/@/second/appobj/DatabaseObjectAppObject'
import SubColumnParamList from '/@/second/appobj/SubColumnParamList'
import WidgetsInnerContainer from '/@/second/widgets/WidgetsInnerContainer.vue'
import LoadingInfo from '/@/second/elements/LoadingInfo.vue'
import ErrorInfo from '/@/second/elements/ErrorInfo.vue'
import { useConnectionInfo, useDatabaseInfo, useDatabaseStatus } from '/@/api/bridge'
import { useClusterApiStore } from '/@/store/modules/clusterApi'
import type { DbCategoryNode } from './DbCategoryAppObject'
import { chevronExpandIcon } from '/@/second/icons/expandIcons'
import { databaseConnectionsRefreshApi } from '/@/api/simpleApis'
import { Button } from 'ant-design-vue'

export default defineComponent({
  name: 'SubDbObjectList',
  props: {
    data: {
      type: Object as PropType<DbCategoryNode>,
      required: true,
    },
    filter: {
      type: String as PropType<string>,
      default: '',
    },
    passProps: {
      type: Object as PropType<{ showPinnedInsteadOfUnpin: boolean }>,
    },
  },
  setup(props) {
    const { data } = toRefs(props)
    const clusterApi = useClusterApiStore()
    const objects = ref<any>(null)
    const status = ref<any>(null)

    watch(
      () => [data.value.conid, data.value.database],
      () => {
        if (!data.value.conid || !data.value.database) {
          objects.value = null
          status.value = null
          return
        }
        objects.value = null
        status.value = null
        useDatabaseInfo({ conid: data.value.conid, database: data.value.database }, objects)
        useDatabaseStatus({ conid: data.value.conid, database: data.value.database }, status)
        useConnectionInfo({ conid: data.value.conid }, clusterApi.setConnection)
      },
      { immediate: true }
    )

    const objectList = computed(() => {
      const o = objects.value || {}
      const fields = data.value.objectTypeFields || []
      const list = fields.flatMap((objectTypeField) =>
        ((o[objectTypeField] || []) as any[]).map((obj) => ({ ...obj, objectTypeField }))
      )
      return sortBy(list, ['schemaName', 'pureName'])
    })

    const handleExpandable = (row: any) =>
      unref(row).objectTypeField === 'tables' || unref(row).objectTypeField === 'views' || unref(row).objectTypeField === 'matviews'

    const handleRefresh = async () => {
      try {
        await databaseConnectionsRefreshApi({
          conid: data.value.conid,
          database: data.value.database,
          keepOpen: true
        })
      } catch (e: any) {
        console.error('刷新数据库结构失败', e)
      }
    }

    onBeforeUnmount(() => {
      objects.value = null
      status.value = null
    })

    return () => (
      <WidgetsInnerContainer>
        {data.value.objectTypeFields.length === 0 ? (
          <ErrorInfo message="暂无内容" icon="img alert" />
        ) : status.value && status.value.name === 'error' ? (
          <ErrorInfo message={`${status.value.message}`} icon="img error" />
        ) : (!status.value || status.value.name === 'pending' || status.value.name === 'checkStructure' || status.value.name === 'loadStructure' || !objects.value) ? (
          <div>
            <LoadingInfo message="Loading database structure" />
            <div style="margin-top: 8px; text-align: center;">
              <Button size="small" onClick={handleRefresh}>刷新</Button>
            </div>
          </div>
        ) : (
          <AppObjectList
            module={DatabaseObjectAppObject}
            subItemsComponent={SubColumnParamList}
            isExpandable={handleExpandable}
            expandIconFunc={chevronExpandIcon}
            list={objectList.value.map((x) => ({ ...x, conid: data.value.conid, database: data.value.database }))}
            passProps={props.passProps}
            filter={props.filter}
          />
        )}
      </WidgetsInnerContainer>
    )
  },
})


