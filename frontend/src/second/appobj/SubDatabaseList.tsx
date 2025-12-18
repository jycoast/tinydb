import {defineComponent, onMounted, PropType, ref, toRefs} from 'vue'
import {sortBy} from 'lodash-es'
import {filterName} from '/@/second/tinydb-tools'
import AppObjectList from '/@/second/appobj/AppObjectList'
import databaseAppObject from './DatabaseAppObject'
import {ConnectionsWithStatus, TablesNameSort} from '/@/second/typings/mysql'
import {useDatabaseList} from "/@/api/bridge";
import SubDbCategoryList from '/@/second/appobj/SubDbCategoryList'
import { chevronExpandIcon } from '/@/second/icons/expandIcons'

export default defineComponent({
  name: "SubDatabaseList",
  props: {
    passProps: {
      type: Object as unknown as PropType<{
        showPinnedInsteadOfUnpin: boolean
      }>,
    },
    data: {
      type: Object as PropType<ConnectionsWithStatus>
    },
    filter: {
      type: String as PropType<string>,
      default: ''
    }
  },
  setup(props) {
    const {data, filter, passProps} = toRefs(props)
    const databases = ref()

    onMounted(() => {
      // Navicat-like: for singleDatabase connections, show the default database as the only child.
      if (data.value?.singleDatabase) {
        const name = (data.value as any)?.defaultDatabase || (data.value as any)?.database || 'default'
        databases.value = [{name, sortOrder: 0}]
      } else {
        useDatabaseList<TablesNameSort[]>({conid: data.value?._id}, databases)
      }
    })

    return () => (
      <AppObjectList
        module={databaseAppObject}
        list={sortBy(
          (databases.value || []).filter(x => filterName(filter.value, x.name)),
          x => x.sortOrder ?? x.name
        ).map(db => ({...db, connection: data.value})
        )}
        passProps={passProps.value}
        subItemsComponent={SubDbCategoryList}
        isExpandable={() => true}
        expandIconFunc={chevronExpandIcon}
        expandOnClick
      />
    )
  }
})
