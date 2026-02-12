import {defineComponent, PropType, toRef} from 'vue'
import AppObjectList from '/@/components/AppObject/AppObjectList'
import {findForeignKeyForColumn} from '/@/lib/tinydb-tools'
import ColumnAppObject from '/@/components/DatabaseTree/ColumnAppObject'
export default defineComponent({
  name: 'SubColumnParamList',
  props: {
    data: Object as PropType<{ columns: any[] }>,
  },
  setup(props) {
    const data = toRef(props, 'data')

    return () => (
      <AppObjectList
        list={(data.value!.columns || []).map(col => ({
          ...data.value,
          ...col,
          foreignKey: findForeignKeyForColumn(data.value as any, col)
        }))}
        module={ColumnAppObject}
      />
    )

  }
})
