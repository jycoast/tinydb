import { defineComponent, PropType, toRefs } from 'vue'
import AppObjectCore from '/@/second/appobj/AppObjectCore.vue'

export type DbCategoryNode = {
  key: 'tables' | 'views' | 'functions' | 'queries'
  label: string
  conid: string
  database: string
  objectTypeFields: string[]
}

const categoryIcons: Record<DbCategoryNode['key'], string> = {
  tables: 'img table',
  views: 'img view',
  functions: 'img function',
  queries: 'img query-data',
}

export default defineComponent({
  name: 'DbCategoryAppObject',
  props: {
    data: {
      type: Object as PropType<DbCategoryNode>,
      required: true,
    },
  },
  setup(props, { attrs }) {
    const { data } = toRefs(props)
    return () => (
      <AppObjectCore
        {...attrs}
        data={data.value}
        title={data.value.label}
        icon={categoryIcons[data.value.key]}
      />
    )
  },
})


