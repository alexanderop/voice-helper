import { spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, extname, sep } from 'node:path'

const versions = ['1', '2']
const builds = new Map()
for (const version of versions) {
  const directory = resolve('.test-builds', `e2e-${version}`)
  const build = spawnSync(
    'pnpm',
    [
      '--filter',
      '@starter/playground',
      'exec',
      'vite',
      'build',
      '--outDir',
      directory,
      '--emptyOutDir',
    ],
    {
      stdio: 'inherit',
      env: { ...process.env, VITE_APP_VERSION: version },
    },
  )
  if (build.status !== 0) process.exit(build.status ?? 1)
  builds.set(version, directory)
}
let active = '1'
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
}
function sendStatus(response, status) {
  response.writeHead(status)
  response.end()
}
function handleTestRoute(request, url, response) {
  if (request.method === 'GET' && url.pathname === '/__test/away') {
    response.writeHead(200, { 'Content-Type': 'text/html' })
    response.end(
      '<!doctype html><title>Another page</title><h1>Another page</h1>',
    )
    return true
  }
  if (request.method !== 'POST' || url.pathname !== '/__test/version')
    return false
  const version = url.searchParams.get('value')
  if (!builds.has(version)) {
    sendStatus(response, 400)
    return true
  }
  active = version
  response.end(active)
  return true
}
function resolveFile(pathname) {
  const directory = builds.get(active)
  let file
  try {
    file = resolve(directory, '.' + decodeURIComponent(pathname))
  } catch {
    return { status: 400 }
  }
  if (file !== directory && !file.startsWith(directory + sep))
    return { status: 403 }
  if (file === directory || !extname(file))
    file = resolve(directory, 'index.html')
  if (!existsSync(file)) return { status: 404 }
  return { file }
}
const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1:42785')
  if (handleTestRoute(request, url, response)) return
  if (request.method !== 'GET') {
    sendStatus(response, 405)
    return
  }
  const { file, status } = resolveFile(url.pathname)
  if (!file) {
    sendStatus(response, status)
    return
  }
  response.writeHead(200, {
    'Content-Type': types[extname(file)] ?? 'application/octet-stream',
  })
  response.end(readFileSync(file))
})
const awayServer = createServer((_request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html' })
  response.end(
    '<!doctype html><title>Another page</title><h1>Another page</h1>',
  )
})
awayServer.listen(42786, '127.0.0.1')
server.listen(42785, '127.0.0.1', () =>
  console.log('Two-version production PWA server ready'),
)
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () =>
    server.close(() => awayServer.close(() => process.exit(0))),
  )
