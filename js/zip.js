/**
 * Minimal ZIP writer — store-only (no compression), zero dependencies.
 *
 * Store-only is the right choice here rather than a limitation: the entries are
 * already-compressed PNG/JPEG/WebP, so deflating them costs CPU for ~0% gain.
 * It also keeps this file small enough to audit, and removes the last runtime
 * dependency the project had.
 *
 * Produces a standard archive: [local header + name + data] per entry, then the
 * central directory, then the end-of-central-directory record.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

/** @param {Uint8Array} buf */
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/**
 * MS-DOS date/time, which is what the ZIP format stores.
 * @param {Date} d
 */
function dosStamp(d) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2) & 0x1f)
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  return { time, date }
}

/**
 * @param {{name: string, data: Uint8Array}[]} files
 * @returns {Blob}
 */
export function makeZip(files) {
  const encoder = new TextEncoder()
  const { time, date } = dosStamp(new Date())
  const parts = []
  const central = []
  let offset = 0

  for (const file of files) {
    const name = encoder.encode(file.name)
    const crc = crc32(file.data)
    const size = file.data.length

    const header = new DataView(new ArrayBuffer(30))
    header.setUint32(0, 0x04034b50, true) // local file header signature
    header.setUint16(4, 20, true) // version needed to extract
    header.setUint16(6, 0x0800, true) // flag: UTF-8 filename
    header.setUint16(8, 0, true) // method 0 = stored
    header.setUint16(10, time, true)
    header.setUint16(12, date, true)
    header.setUint32(14, crc, true)
    header.setUint32(18, size, true) // compressed size
    header.setUint32(22, size, true) // uncompressed size
    header.setUint16(26, name.length, true)
    const headerBytes = new Uint8Array(header.buffer)

    parts.push(headerBytes, name, file.data)

    const entry = new DataView(new ArrayBuffer(46))
    entry.setUint32(0, 0x02014b50, true) // central directory signature
    entry.setUint16(4, 20, true) // version made by
    entry.setUint16(6, 20, true) // version needed
    entry.setUint16(8, 0x0800, true)
    entry.setUint16(10, 0, true)
    entry.setUint16(12, time, true)
    entry.setUint16(14, date, true)
    entry.setUint32(16, crc, true)
    entry.setUint32(20, size, true)
    entry.setUint32(24, size, true)
    entry.setUint16(28, name.length, true)
    entry.setUint32(42, offset, true) // offset of local header
    central.push(new Uint8Array(entry.buffer), name)

    offset += headerBytes.length + name.length + size
  }

  const centralSize = central.reduce((n, c) => n + c.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true) // end of central directory
  end.setUint16(8, files.length, true) // entries on this disk
  end.setUint16(10, files.length, true) // total entries
  end.setUint32(12, centralSize, true)
  end.setUint32(16, offset, true) // central directory offset

  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], {
    type: 'application/zip',
  })
}
