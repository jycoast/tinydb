<template>
  <div>
    <table>
      <tbody>
        <tr>
          <td v-resizeObserver="true" :resize="changeGridRowHeight">
            title
            <InlineButton square>
              <FontIcon icon="icon chevron-down"/>
            </InlineButton>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import {defineComponent, ref} from 'vue'
import InlineButton from '/@/components/Button/src/InlineButton.vue'
import FontIcon from '/@/components/Icon/src/FontIcon.vue'
import {isNumber} from '/@/utils/is'
export const dataGridRowHeight = ref(0)

export default defineComponent({
  name: 'DataGridRowHeightMeter',
  components: {
    InlineButton,
    FontIcon,
  },
  setup() {
    function changeGridRowHeight(e) {
      if (isNumber(e.detail.height)) {
        dataGridRowHeight.value = e.detail.height + 1
      }
    }

    return {
      changeGridRowHeight
    }
  }
})
</script>

<style scoped>
div {
  position: fixed;
  left: -1000px;
  top: -1000px;
  visibility: hidden;
}

td {
  display: flex;
}
</style>
