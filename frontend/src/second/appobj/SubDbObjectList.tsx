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
        ) : !objects.value ||
          (status.value &&
            (status.value.name === 'pending' || status.value.name === 'checkStructure' || status.value.name === 'loadStructure')) ? (
          <LoadingInfo message="Loading database structure" />
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


