import { spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, extname, sep } from 'node:path'

const directory = resolve('.test-builds', 'e2e')
const build = spawnSync(
  'pnpm',
  [
    '--filter',
    '@talk-coach/web',
    'exec',
    'vite',
    'build',
    '--outDir',
    directory,
    '--emptyOutDir',
  ],
  { stdio: 'inherit', env: { ...process.env, VITE_APP_VERSION: 'e2e' } },
)
if (build.status !== 0) process.exit(build.status ?? 1)
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
function resolveFile(pathname) {
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
server.listen(42785, '127.0.0.1', () =>
  console.log('Production PWA server ready'),
)
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => server.close(() => process.exit(0)))
