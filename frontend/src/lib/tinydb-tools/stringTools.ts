import { isArray, isPlainObject } from 'lodash-es'

export function arrayToHexString(byteArray) {
  return byteArray.reduce((output, elem) => output + ('0' + elem.toString(16)).slice(-2), '').toUpperCase();
}

export function stringifyCellValue(value) {
  if (value === null) return '(NULL)';
  if (value === undefined) return '(NoField)';
  if (value?.type == 'Buffer' && isArray(value.data)) return '0x' + arrayToHexString(value.data);
  if (value?.$oid) return `ObjectId("${value?.$oid}")`;
  if (isPlainObject(value) || isArray(value)) return JSON.stringify(value);
  return value;
}

export function safeJsonParse(json, defaultValue?, logError = false) {
  try {
    return JSON.parse(json);
  } catch (err) {
    if (logError) {
      console.error(`Error parsing JSON value "${json}"`, err);
    }
    return defaultValue;
  }
}
