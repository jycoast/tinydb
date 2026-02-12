import {splitQuery} from '/@/lib/tinydb-splitter'

export default function c(data) {
  return splitQuery(data.text, data.options);
}
