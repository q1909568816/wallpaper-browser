const PREVIEW_MARKER = '__wp__/'
let fileMap = new Map()
let activeTabId = null

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('message', (event) => {
  const { type, files, tabId } = event.data

  if (type === 'init') {
    fileMap = new Map(files)
    activeTabId = tabId
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ type: 'init-done', count: fileMap.size })
    }
  } else if (type === 'clear') {
    fileMap.clear()
    activeTabId = null
  }
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  const idx = url.pathname.indexOf(PREVIEW_MARKER)

  if (idx === -1) return

  const rawPath = decodeURIComponent(url.pathname.slice(idx + PREVIEW_MARKER.length))

  // try full relative path first (e.g., images/img1.svg)
  if (rawPath && fileMap.has(rawPath)) {
    return respondWithBlob(event, fileMap.get(rawPath), rawPath)
  }

  const lowerPath = rawPath.toLowerCase()
  for (const [key, value] of fileMap) {
    if (key.toLowerCase() === lowerPath) {
      return respondWithBlob(event, value, key)
    }
  }

  // fallback: match by filename only
  const basename = rawPath.split('/').pop() || ''
  if (basename && fileMap.has(basename)) {
    return respondWithBlob(event, fileMap.get(basename), basename)
  }

  const lowerBasename = basename.toLowerCase()
  for (const [key, value] of fileMap) {
    const keyBasename = key.split('/').pop() || ''
    if (keyBasename.toLowerCase() === lowerBasename) {
      return respondWithBlob(event, value, key)
    }
  }

  event.respondWith(new Response('Not Found', { status: 404 }))
})

function respondWithBlob(event, blob, filename) {
  const mimeType = blob.type || getMimeType(filename)
  const response = new Response(blob, {
    status: 200,
    headers: {
      'Content-Type': mimeType,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    }
  })
  event.respondWith(response)
}

function getMimeType(filename) {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const mimeTypes = {
    'html': 'text/html',
    'htm': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'mjs': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'bmp': 'image/bmp',
    'ico': 'image/x-icon',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'ogg': 'audio/ogg',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'otf': 'font/otf',
    'xml': 'application/xml',
    'txt': 'text/plain',
    'csv': 'text/csv',
    'gltf': 'model/gltf+json',
    'glb': 'model/gltf-binary',
    'wasm': 'application/wasm',
    'pdf': 'application/pdf',
    'zip': 'application/zip',
    'md': 'text/markdown'
  }
  return mimeTypes[ext] || 'application/octet-stream'
}
