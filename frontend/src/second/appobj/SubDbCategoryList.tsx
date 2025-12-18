import { computed, defineComponent, onMounted, PropType, toRefs, unref } from 'vue'
import AppObjectList from '/@/second/appobj/AppObjectList'
import DbCategoryAppObject, { DbCategoryNode } from '/@/second/appobj/DbCategoryAppObject'
import SubDbObjectList from '/@/second/appobj/SubDbObjectList'
import { chevronExpandIcon } from '/@/second/icons/expandIcons'
import type { IPinnedDatabasesItem } from '/@/second/typings/types/standard.d'
import { databaseConnectionsRefreshApi, serverConnectionsRefreshApi } from '/@/api/simpleApis'

const refreshedOnce = new Set<string>()

export default defineComponent({
  name: 'SubDbCategoryList',
  props: {
    data: {
      type: Object as PropType<IPinnedDatabasesItem>,
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

    const conid = computed(() => unref(data)?.connection?._id)
    const database = computed(() => unref(data)?.name)

    // Important: backend typically loads structure only after an explicit refresh.
    // Trigger once when the database node is expanded (this component is mounted).
    onMounted(() => {
      if (!conid.value || !database.value) return
      const key = `${conid.value}::${database.value}`
      if (refreshedOnce.has(key)) return
      refreshedOnce.add(key)
      // Ensure server connection is open before refreshing a database connection.
      void serverConnectionsRefreshApi({ conid: conid.value, keepOpen: true }).then(() => {
        void databaseConnectionsRefreshApi({ conid: conid.value!, database: database.value!, keepOpen: true })
      })
    })

    const categories = computed<DbCategoryNode[]>(() => {
      if (!conid.value || !database.value) return []
      return [
        { key: 'tables', label: '表', conid: conid.value, database: database.value, objectTypeFields: ['tables'] },
        { key: 'views', label: '视图', conid: conid.value, database: database.value, objectTypeFields: ['views', 'matviews'] },
        { key: 'functions', label: '函数', conid: conid.value, database: database.value, objectTypeFields: ['functions'] },
        { key: 'queries', label: '查询', conid: conid.value, database: database.value, objectTypeFields: [] },
      ]
    })

    const isExpandable = (_row: DbCategoryNode) => true

    return () => (
      <AppObjectList
        module={DbCategoryAppObject}
        list={categories.value}
        subItemsComponent={SubDbObjectList}
        isExpandable={isExpandable as any}
        expandIconFunc={chevronExpandIcon}
        expandOnClick
        filter={props.filter}
        passProps={props.passProps}
      />
    )
  },
})


