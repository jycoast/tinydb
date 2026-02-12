import { defineAsyncComponent } from 'vue';
import { ElIcon } from 'element-plus';
import { Loading } from '@element-plus/icons-vue';
import { noop } from '/@/utils';

interface Options {
  size?: 'default' | 'small' | 'large';
  delay?: number;
  timeout?: number;
  loading?: boolean;
  retry?: boolean;
}

export function createAsyncComponent(loader: Fn, options: Options = {}) {
  const { delay = 100, timeout = 30000, loading = false, retry = true } = options;
  return defineAsyncComponent({
    loader,
    loadingComponent: loading ? <ElIcon class="is-loading"><Loading /></ElIcon> : undefined,
    timeout,
    delay,
    onError: !retry
      ? noop
      : (error, retry, fail, attempts) => {
          if (error.message.match(/fetch/) && attempts <= 3) {
            retry();
          } else {
            fail();
          }
        },
  });
}
