import {isString, isArray, isPlainObject} from 'lodash-es'

export function arrayToHexString(byteArray) {
  return byteArray.reduce((output, elem) => output + ('0' + elem.toString(16)).slice(-2), '').toUpperCase();
}

export function hexStringToArray(inputString) {
  const hex = inputString.toString();
  const res = [];
  for (let n = 0; n < hex.length; n += 2) {
    // @ts-ignore
    res.push(parseInt(hex.substr(n, 2), 16));
  }
  return res;
}

export function parseCellValue(value) {
  if (!isString(value)) return value;

  if (value == '(NULL)') return null;

  const mHex = value.match(/^0x([0-9a-fA-F][0-9a-fA-F])+$/);
  if (mHex) {
    return {
      type: 'Buffer',
      data: hexStringToArray(value.substring(2)),
    };
  }

  const mOid = value.match(/^ObjectId\("([0-9a-f]{24})"\)$/);
  if (mOid) {
    return { $oid: mOid[1] };
  }

  return value;
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

export function isJsonLikeLongString(value) {
  return isString(value) && value.length > 100 && value.match(/^\s*\{.*\}\s*$|^\s*\[.*\]\s*$/);
}

export function isWktGeometry(s) {
  if (!isString(s)) return false;

  // return !!s.match(/^POINT\s*\(|/)
  return !!s.match(
    /^POINT\s*\(|^LINESTRING\s*\(|^POLYGON\s*\(|^MULTIPOINT\s*\(|^MULTILINESTRING\s*\(|^MULTIPOLYGON\s*\(|^GEOMCOLLECTION\s*\(|^GEOMETRYCOLLECTION\s*\(/
  );
}


