const GRAY = '\x1b[90m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RED = '\x1b[31m'
const CYAN = '\x1b[36m'
const MAGENTA = '\x1b[35m'
const RESET = '\x1b[0m'

function ts() {
  return new Date().toISOString()
}

function fmt(level, tag, message, meta) {
  const color = { info: GREEN, warn: YELLOW, error: RED, req: CYAN, bot: MAGENTA }[level] || RESET
  const prefix = `${GRAY}${ts()}${RESET} ${color}[${tag}]${RESET}`
  if (meta !== undefined) {
    const metaStr = typeof meta === 'string' ? meta : JSON.stringify(meta)
    return `${prefix} ${message} ${GRAY}${metaStr}${RESET}`
  }
  return `${prefix} ${message}`
}

export const log = {
  info(tag, message, meta) {
    console.log(fmt('info', tag, message, meta))
  },

  warn(tag, message, meta) {
    console.warn(fmt('warn', tag, message, meta))
  },

  error(tag, message, meta) {
    console.error(fmt('error', tag, message, meta))
  },

  req(method, url, status, durationMs) {
    const color = status >= 500 ? RED : status >= 400 ? YELLOW : GREEN
    console.log(
      `${GRAY}${ts()}${RESET} ${CYAN}[HTTP]${RESET} ${method} ${url} → ${color}${status}${RESET} ${GRAY}${durationMs}ms${RESET}`,
    )
  },

  bot(direction, chatId, command, detail) {
    const arrow = direction === 'in' ? '→' : '←'
    const d = detail ? ` ${GRAY}${detail}${RESET}` : ''
    console.log(
      `${GRAY}${ts()}${RESET} ${MAGENTA}[BOT]${RESET} ${arrow} chat:${chatId} /${command}${d}`,
    )
  },
}
