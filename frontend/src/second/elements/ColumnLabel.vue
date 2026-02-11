<template>
  <a-space class="label" :class="notNull && 'notNull'" size="small">
    <FontIcon v-if="icon" :icon="icon"/>
    <a-typography-text :strong="notNull">
      {{headerText || columnName}}
    </a-typography-text>

    <a-tag v-if="extInfo" size="small" color="default" class="extinfo">{{ extInfo }}</a-tag>

    <template v-if="showDataType">
      <a-space v-if="foreignKey" size="small" class="extinfo">
        <FontIcon icon="icon arrow-right"/>
      </a-space>

      <a-tag v-else-if="dataType" size="small" color="default" class="extinfo">
        {{dataType.toLowerCase()}}
      </a-tag>

      <a-tooltip v-if="columnComment" :title="columnComment">
        <a-typography-text type="secondary" class="comment">{{ columnComment }}</a-typography-text>
      </a-tooltip>
    </template>
  </a-space>
</template>

<script lang="ts">
import {computed, defineComponent, PropType, toRefs, unref,} from 'vue'
import FontIcon from '/@/components/Icon/src/FontIcon.vue'
import {Space, Tag, Typography, Tooltip} from 'ant-design-vue'
import {openDatabaseObjectDetail} from '/@/second/database-tree/DatabaseObjectAppObject'

export function getColumnIcon(column, forceIcon = false) {
  if (unref(column).autoIncrement) return 'img autoincrement';
  if (unref(column).foreignKey) return 'img foreign-key';
  if (forceIcon) return 'img column';
  return null;
}

export default defineComponent( {
  name: "ColumnLabel",
  components: {
    FontIcon,
    ASpace: Space,
    ATag: Tag,
    ATypographyText: Typography.Text,
    ATooltip: Tooltip
  },
  props: {
    notNull: {
      type: Boolean as PropType<boolean>,
      default: false
    },
    forceIcon: {
      type: Boolean as PropType<boolean>,
      default: false
    },
    headerText: {
      type: String as PropType<string>,
      default: ''
    },
    columnName: {
      type: [String, Object] as PropType<string | object>,
      default: ''
    },
    extInfo: {
      type: String as PropType<string>
    },
    dataType: {
      type: String as PropType<string>
    },
    columnComment: {
      type: String as PropType<string>,
    },
    showDataType: {
      type: Boolean as PropType<boolean>,
      default: false
    },
    foreignKey: {
      type: Object as PropType<{
        refSchemaName: string
        refTableName: string
      }>
    },
    conid: {
      type: String as PropType<string>,
    },
    database: {
      type: String as PropType<string>,
    },
    iconOverride: {
      type: String as PropType<string>,
    }
  },
  setup(props, {attrs}) {
    const {
      notNull,
      forceIcon,
      headerText,
      columnName,
      extInfo,
      dataType,
      columnComment,
      showDataType,
      foreignKey,
      conid,
      database,
      iconOverride
    } = toRefs(props)

    const icon = computed(() => iconOverride.value || getColumnIcon(Object.assign({}, props, attrs), forceIcon.value))

    function handler(e: Event) {
      e.stopPropagation()
      openDatabaseObjectDetail('TableDataTab', null, {
        schemaName: foreignKey.value!.refSchemaName,
        pureName: foreignKey.value!.refTableName,
        conid,
        database,
        objectTypeField: 'tables',
      })
    }

    return {
      notNull,
      forceIcon,
      headerText,
      columnName,
      extInfo,
      dataType,
      columnComment,
      showDataType,
      foreignKey,
      conid,
      database,
      icon,
      handler
    }
  }
})
</script>

<style scoped>
.label {
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
}

.label.notNull {
  font-weight: bold;
}

.extinfo {
  font-weight: normal;
  margin-left: 5px;
  color: var(--theme-font-3);
}

.comment {
  font-weight: normal;
  margin-left: 8px;
  color: var(--theme-font-4);
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
}
</style>
