<template>
  <a-input
    size="small"
    autocomplete="off"
    :placeholder="placeholder"
    v-model:value="searchValue"
    @input="handleInput"
    @keydown="handleKeyDown"
    allow-clear
    :prefix="h(SearchOutlined)"
  />
</template>

<script lang="ts">
  import {defineComponent, ref, unref, watch, toRef, PropType, h} from 'vue'
  import {debounce} from 'lodash-es'
  import {Input} from 'ant-design-vue'
  import {SearchOutlined} from '@ant-design/icons-vue'
  import keycodes from '/@/utils/tinydb/keycodes'

  export default defineComponent({
    name: 'SearchInput',
    components: {
      AInput: Input
    },
    props: {
      placeholder: {
        type: String as PropType<string>,
      },
      isDebounced: {
        type: Boolean as PropType<boolean>,
      },
      value: {
        type: String as PropType<string>,
      }
    },
    emits: ['update:value'],
    setup(props, {emit}) {
      const isDebounced = toRef(props, 'isDebounced')
      const value = toRef(props, 'value')

      const searchValue = ref<string>(props.value || '')
      const debouncedSet = debounce(x => {emit('update:value', unref(x))}, 500)

      function handleKeyDown(e: KeyboardEvent) {
        if (e.keyCode == keycodes.escape) {
          searchValue.value = ''
          emit('update:value', '')
        }
      }

      function handleInput() {
        if (unref(isDebounced)) {
          debouncedSet(searchValue.value)
        } else {
          emit('update:value', searchValue.value)
        }
      }

      watch(() => value.value, () => {
        if (value.value === '') searchValue.value = ''
        else if (value.value !== undefined) searchValue.value = value.value
      }, {immediate: true})

      return {
        h,
        value,
        searchValue,
        placeholder: props.placeholder,
        debouncedSet,
        handleKeyDown,
        handleInput,
        SearchOutlined
      }
    }
  })
</script>
