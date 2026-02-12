import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"

const DATE_TIME_FORMAT = "YYYY-MM-DD HH:mm:ss"

dayjs.extend(relativeTime)

export function formatToDateTime(
  date: dayjs.Dayjs | undefined = undefined,
  format = DATE_TIME_FORMAT,
): string {
  return dayjs(date).format(format)
}

export function fromNow(
  date: dayjs.Dayjs | undefined = undefined,
  withoutSuffix?: boolean,
): string {
  return dayjs(date).fromNow(withoutSuffix)
}
