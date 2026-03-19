export function isValidHost(host: string): boolean {
  if (!host) return false
  // IP address or hostname
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
  const hostnameRegex = /^[a-zA-Z0-9][a-zA-Z0-9\-._]*[a-zA-Z0-9]$/
  return ipRegex.test(host) || hostnameRegex.test(host) || host === 'localhost'
}

export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535
}

export function isValidRedisKey(key: string): boolean {
  return key.length > 0 && key.length <= 512 * 1024 * 1024
}

export function isValidConnectionName(name: string): boolean {
  return name.trim().length > 0 && name.length <= 100
}

export function isValidJson(str: string): boolean {
  try {
    JSON.parse(str)
    return true
  } catch {
    return false
  }
}

export function isValidTTL(ttl: number): boolean {
  return Number.isInteger(ttl) && ttl >= -1
}

export function isValidScanPattern(pattern: string): boolean {
  return pattern.length > 0 && pattern.length <= 1000
}
