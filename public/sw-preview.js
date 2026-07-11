const PREVIEW_MARKER = '__wp__/'
let fileMap = new Map()
let fileMapReady = null
let fileMapReadyResolve = null
let previewClient = null

function resetFileMapReady() {
  fileMapReady = new Promise((resolve) => {
    fileMapReadyResolve = resolve
  })
}

resetFileMapReady()

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('message', (event) => {
  const { type, files } = event.data

  if (type === 'SKIP_WAITING') {
    self.skipWaiting()
    return
  }

  if (type === 'init') {
    fileMap = new Map(files)
    if (fileMapReadyResolve) {
      fileMapReadyResolve()
      fileMapReadyResolve = null
    }
    if (event.source) {
      previewClient = event.source
    }
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ type: 'init-done', count: fileMap.size })
    }
  } else if (type === 'clear') {
    fileMap.clear()
    resetFileMapReady()
  } else if (type === 'list-files') {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ type: 'files-list', keys: [...fileMap.keys()] })
    }
  } else if (type === 'file-response') {
    const { path, blob } = event.data
    if (path && blob) {
      fileMap.set(path, blob)
    }
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ type: 'file-response-ack' })
    }
  }
})

async function requestFileFromClient(path) {
  try {
    if (!previewClient) {
      const clients = await self.clients.matchAll({ type: 'window' })
      for (const client of clients) {
        if (client.url.indexOf(self.location.pathname) !== -1) {
          previewClient = client
          break
        }
      }
    }
    
    if (!previewClient) return null

    return new Promise((resolve) => {
      const channel = new MessageChannel()
      channel.port1.onmessage = (e) => {
        if (e.data?.type === 'file-data') {
          resolve(e.data.blob || null)
        } else {
          resolve(null)
        }
      }
      setTimeout(() => resolve(null), 5000)
      
      try {
        previewClient.postMessage({ type: 'request-file', path }, [channel.port2])
      } catch {
        resolve(null)
      }
    })
  } catch {
    return null
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  const idx = url.pathname.indexOf(PREVIEW_MARKER)

  // Primary path: requests with __wp__/ marker
  if (idx !== -1) {
    const rawPath = decodeURIComponent(url.pathname.slice(idx + PREVIEW_MARKER.length))
    const normalizedPath = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath

    event.respondWith((async () => {
      try {
        if (fileMap.size === 0 && fileMapReady) {
          await Promise.race([
            fileMapReady,
            new Promise((r) => setTimeout(r, 5000))
          ])
        }

        const found = findInFileMap(normalizedPath)
        if (found) {
          return makeBlobResponse(found.blob, found.name)
        }

        const fetchedBlob = await requestFileFromClient(normalizedPath)
        if (fetchedBlob) {
          fileMap.set(normalizedPath, fetchedBlob)
          return makeBlobResponse(fetchedBlob, normalizedPath)
        }

        return new Response('Not found: ' + normalizedPath, {
          status: 404,
          headers: { 'Content-Type': 'text/plain' }
        })
      } catch (e) {
        return new Response('Error: ' + e.message, {
          status: 500,
          headers: { 'Content-Type': 'text/plain' }
        })
      }
    })())
    return
  }

  // Fallback: intercept same-origin GET requests from preview iframe
  if (event.request.method === 'GET' && url.origin === self.location.origin) {
    const pathname = url.pathname
    if (pathname.startsWith('/@') || pathname.startsWith('/node_modules/') ||
        pathname.endsWith('.hot-update.js') || pathname.endsWith('.hot-update.json') ||
        pathname.startsWith(self.location.pathname + '@vite/') ||
        pathname === self.location.pathname ||
        pathname === self.location.pathname.replace(/\/$/, '') + '/' ||
        pathname.endsWith('/src/main.ts') ||
        pathname.endsWith('/src/App.vue')) {
      return
    }

    const basePath = self.location.pathname.replace(/\/$/, '')
    let relPath = pathname
    if (relPath.startsWith(basePath + '/')) {
      relPath = relPath.slice(basePath.length + 1)
    } else if (relPath.startsWith('/')) {
      relPath = relPath.slice(1)
    }

    if (!relPath || relPath.startsWith('src/') || relPath.startsWith('@') || relPath.startsWith('node_modules/')) {
      return
    }

    event.respondWith((async () => {
      try {
        let isPreviewRequest = false
        const clientId = event.clientId
        if (clientId) {
          try {
            const client = await self.clients.get(clientId)
            if (client && client.url.indexOf(PREVIEW_MARKER) !== -1) {
              isPreviewRequest = true
            }
          } catch {}
        }

        if (!isPreviewRequest) {
          const referer = event.request.referrer || ''
          if (referer.indexOf(PREVIEW_MARKER) === -1) {
            return fetch(event.request)
          }
          isPreviewRequest = true
        }

        const found = findInFileMap(relPath)
        if (found) return makeBlobResponse(found.blob, found.name)

        const fetchedBlob = await requestFileFromClient(relPath)
        if (fetchedBlob) {
          fileMap.set(relPath, fetchedBlob)
          return makeBlobResponse(fetchedBlob, relPath)
        }

        return new Response('Not found: ' + relPath, {
          status: 404,
          headers: { 'Content-Type': 'text/plain' }
        })
      } catch (e) {
        return new Response('Error: ' + e.message, {
          status: 500,
          headers: { 'Content-Type': 'text/plain' }
        })
      }
    })())
  }
})

function findInFileMap(path) {
  if (!path) return null
  const normalized = path.startsWith('/') ? path.slice(1) : path

  if (fileMap.has(normalized)) return { blob: fileMap.get(normalized), name: normalized }

  const lower = normalized.toLowerCase()
  for (const [key, value] of fileMap) {
    if (key.toLowerCase() === lower) return { blob: value, name: key }
  }

  const basename = normalized.split('/').pop() || ''
  if (basename && fileMap.has(basename)) return { blob: fileMap.get(basename), name: basename }

  const lowerBasename = basename.toLowerCase()
  for (const [key, value] of fileMap) {
    const keyBasename = key.split('/').pop() || ''
    if (keyBasename.toLowerCase() === lowerBasename) return { blob: value, name: key }
  }

  for (const [key, value] of fileMap) {
    const keyLower = key.toLowerCase()
    if (keyLower.endsWith('/' + lower) || keyLower.endsWith('/' + lowerBasename)) {
      return { blob: value, name: key }
    }
  }

  const parts = normalized.split('/')
  for (let i = 1; i < parts.length; i++) {
    const partial = parts.slice(i).join('/')
    if (fileMap.has(partial)) return { blob: fileMap.get(partial), name: partial }
  }

  return null
}

function makeBlobResponse(blob, filename) {
  const mimeType = blob.type || getMimeType(filename)
  return new Response(blob, {
    status: 200,
    headers: {
      'Content-Type': mimeType,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    }
  })
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
    'atlas': 'text/plain',
    'skel': 'application/octet-stream',
    'gltf': 'model/gltf+json',
    'glb': 'model/gltf-binary',
    'wasm': 'application/wasm',
    'pdf': 'application/pdf',
    'zip': 'application/zip',
    'md': 'text/markdown'
  }
  return mimeTypes[ext] || 'application/octet-stream'
}
