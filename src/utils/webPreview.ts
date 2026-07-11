const PREVIEW_PREFIX = (import.meta.env.BASE_URL || '/') + '__wp__/'
const RESOURCE_ATTRS = [
  { tag: 'img', attr: 'src' },
  { tag: 'img', attr: 'srcset' },
  { tag: 'script', attr: 'src' },
  { tag: 'link', attr: 'href' },
  { tag: 'source', attr: 'src' },
  { tag: 'source', attr: 'srcset' },
  { tag: 'video', attr: 'src' },
  { tag: 'video', attr: 'poster' },
  { tag: 'audio', attr: 'src' },
  { tag: 'object', attr: 'data' },
  { tag: 'embed', attr: 'src' },
  { tag: 'track', attr: 'src' },
  { tag: 'iframe', attr: 'src' },
  { tag: 'use', attr: 'href' },
  { tag: 'input', attr: 'src', filter: 'type', filterValue: 'image' },
]

let swRegistration: ServiceWorkerRegistration | null = null
let previewFolderHandle: FileSystemDirectoryHandle | null = null

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', async (event) => {
    if (event.data?.type === 'request-file') {
      const path = event.data.path
      if (!path || !previewFolderHandle) {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ type: 'file-data', blob: null })
        }
        return
      }

      try {
        const parts = path.split('/')
        let current = previewFolderHandle
        for (let i = 0; i < parts.length - 1; i++) {
          current = await current.getDirectoryHandle(parts[i])
        }
        const fileHandle = await current.getFileHandle(parts[parts.length - 1])
        const file = await fileHandle.getFile()
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ type: 'file-data', blob: file })
        }
      } catch {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ type: 'file-data', blob: null })
        }
      }
    }
  })
}

async function ensureServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return

  try {
    if (!swRegistration) {
      swRegistration = await navigator.serviceWorker.register(
        import.meta.env.BASE_URL + 'sw-preview.js',
        { scope: import.meta.env.BASE_URL || '/' }
      )
    }

    if (!navigator.serviceWorker.controller) {
      await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<void>((resolve) => setTimeout(resolve, 5000))
      ])
    }

    if (!swRegistration) {
      swRegistration = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL || '/') || null
    }
  } catch {
    swRegistration = null
  }
}

function sendFilesToSW(files: [string, Blob][]): Promise<void> {
  return new Promise(async (resolve) => {
    let target = navigator.serviceWorker.controller
    if (!target && swRegistration?.active) {
      target = swRegistration.active
    }
    if (!target) {
      try {
        await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<void>((r) => setTimeout(r, 5000))
        ])
      } catch {}
      target = navigator.serviceWorker.controller || swRegistration?.active || null
    }
    if (!target) {
      resolve()
      return
    }
    const channel = new MessageChannel()
    let settled = false
    channel.port1.onmessage = (e) => {
      if (e.data?.type === 'init-done' && !settled) {
        settled = true
        resolve()
      }
    }
    try {
      target.postMessage({ type: 'init', files }, [channel.port2])
    } catch {
      resolve()
    }
    setTimeout(() => {
      if (!settled) {
        settled = true
        resolve()
      }
    }, 5000)
  })
}

function clearSWCache(): void {
  previewFolderHandle = null
}

export async function readAllFilesRecursive(dirHandle: FileSystemDirectoryHandle, prefix = ''): Promise<Map<string, Blob>> {
  const fileMap = new Map<string, Blob>()
  try {
    for await (const [name, handle] of dirHandle.entries()) {
      const relativePath = prefix ? prefix + '/' + name : name
      if (handle.kind === 'file') {
        try {
          const file = await (handle as FileSystemFileHandle).getFile()
          fileMap.set(relativePath, file)
        } catch {
        }
      } else if (handle.kind === 'directory') {
        try {
          const subFiles = await readAllFilesRecursive(handle as FileSystemDirectoryHandle, relativePath)
          for (const [subPath, blob] of subFiles) {
            fileMap.set(subPath, blob)
          }
        } catch {
        }
      }
    }
  } catch {
  }
  return fileMap
}

function normalizeResourcePath(rawPath: string, _baseDir: string, fileMap: Map<string, Blob>): string | null {
  if (!rawPath || rawPath.startsWith('data:') || rawPath.startsWith('blob:') || rawPath.startsWith('http')) {
    return null
  }

  let path = rawPath.trim()

  const hashIndex = path.indexOf('#')
  let hash = ''
  if (hashIndex !== -1) {
    hash = path.slice(hashIndex)
    path = path.slice(0, hashIndex)
  }

  const queryIndex = path.indexOf('?')
  let query = ''
  if (queryIndex !== -1) {
    query = path.slice(queryIndex)
    path = path.slice(0, queryIndex)
  }

  if (!path) return null

  const relativePath = path.replace(/^\.?\/+/g, '')
  if (!relativePath) return null

  if (fileMap.has(relativePath)) {
    return PREVIEW_PREFIX + relativePath.split('/').map(encodeURIComponent).join('/') + query + hash
  }

  const lowerPath = relativePath.toLowerCase()
  for (const key of fileMap.keys()) {
    if (key.toLowerCase() === lowerPath) {
      return PREVIEW_PREFIX + key.split('/').map(encodeURIComponent).join('/') + query + hash
    }
  }

  // fallback: match by filename only (ignore directory prefix)
  const basename = relativePath.split('/').pop() || ''
  if (basename && fileMap.has(basename)) {
    return PREVIEW_PREFIX + encodeURIComponent(basename) + query + hash
  }
  const lowerBasename = basename.toLowerCase()
  for (const key of fileMap.keys()) {
    const keyBasename = key.split('/').pop() || ''
    if (keyBasename.toLowerCase() === lowerBasename) {
      return PREVIEW_PREFIX + encodeURIComponent(keyBasename) + query + hash
    }
  }

  return null
}

function patchSrcsetValue(value: string, fileMap: Map<string, Blob>): string {
  return value.replace(/([^\s,]+)(\s+\d+[wx])?/g, (match, url, descriptor) => {
    const newPath = normalizeResourcePath(url, '', fileMap)
    if (newPath) {
      return newPath + (descriptor || '')
    }
    return match
  })
}

function patchHtmlResources(html: string, fileMap: Map<string, Blob>): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  for (const { tag, attr, filter, filterValue } of RESOURCE_ATTRS) {
    const elements = doc.querySelectorAll(tag)
    for (const el of elements) {
      if (filter && (el as any)[filter] !== filterValue) continue

      let value = el.getAttribute(attr)
      if (!value) continue

      if (attr === 'srcset') {
        const newValue = patchSrcsetValue(value, fileMap)
        if (newValue !== value) {
          el.setAttribute(attr, newValue)
        }
        continue
      }

      const newPath = normalizeResourcePath(value, '', fileMap)
      if (newPath) {
        el.setAttribute(attr, newPath)
      }
    }
  }

  // patch inline CSS url()
  const styleElements = doc.querySelectorAll('style')
  for (const styleEl of styleElements) {
    const css = styleEl.textContent || ''
    const patched = css.replace(/url\(\s*['"]?\s*([^'")\s]+)\s*['"]?\s*\)/gi, (match, rawPath) => {
      const newPath = normalizeResourcePath(rawPath.trim(), '', fileMap)
      if (newPath) {
        return `url(${newPath})`
      }
      return match
    })
    if (patched !== css) {
      styleEl.textContent = patched
    }
  }

  // patch inline style attributes
  const allWithStyle = doc.querySelectorAll('[style]')
  for (const el of allWithStyle) {
    const styleAttr = el.getAttribute('style') || ''
    const patched = styleAttr.replace(/url\(\s*['"]?\s*([^'")\s]+)\s*['"]?\s*\)/gi, (match, rawPath) => {
      const newPath = normalizeResourcePath(rawPath.trim(), '', fileMap)
      if (newPath) {
        return `url(${newPath})`
      }
      return match
    })
    if (patched !== styleAttr) {
      el.setAttribute('style', patched)
    }
  }

  let base = doc.querySelector('base')
  if (base) {
    base.setAttribute('href', PREVIEW_PREFIX)
  } else {
    base = doc.createElement('base')
    base.setAttribute('href', PREVIEW_PREFIX)
    if (doc.head) {
      doc.head.insertBefore(base, doc.head.firstChild)
    }
  }

  const interceptScript = doc.createElement('script')
  interceptScript.textContent = `
    (function() {
      var P = ${JSON.stringify(PREVIEW_PREFIX)};
      function rewrite(url) {
        if (typeof url !== 'string' || !url) return url;
        if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('//')) return url;
        if (url.indexOf('__wp__/') !== -1) return url;
        if (url.startsWith('http:') || url.startsWith('https:')) {
          var u;
          try { u = new URL(url); } catch(e) { return url; }
          if (u.origin !== window.location.origin) return url;
          var p = u.pathname;
          if (p.indexOf('__wp__/') !== -1) return url;
          var base = ${JSON.stringify(import.meta.env.BASE_URL || '/')};
          if (p.startsWith(base)) p = p.slice(base.length);
          if (p.startsWith('/')) p = p.slice(1);
          return P + p + u.search + u.hash;
        }
        var qIdx = url.indexOf('?');
        var hIdx = url.indexOf('#');
        var path = url;
        var suffix = '';
        if (qIdx !== -1 || hIdx !== -1) {
          var cut = (qIdx !== -1) ? qIdx : hIdx;
          path = url.substring(0, cut);
          suffix = url.substring(cut);
        }
        while (path.startsWith('./')) path = path.slice(2);
        while (path.startsWith('../')) path = path.slice(3);
        if (path.startsWith('/')) path = path.slice(1);
        return P + path + suffix;
      }
      var origFetch = window.fetch;
      var wrappedFetch = function(input, init) {
        if (typeof input === 'string') input = rewrite(input);
        else if (input && input.url) input = new Request(rewrite(input.url), input);
        return origFetch.call(this, input, init);
      };
      Object.defineProperty(window, 'fetch', {
        value: wrappedFetch,
        writable: true,
        configurable: true
      });
      var origOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(method, url) {
        arguments[1] = rewrite(url);
        return origOpen.apply(this, arguments);
      };
      var origCreateElement = document.createElement;
      document.createElement = function(tag) {
        var el = origCreateElement.apply(this, arguments);
        if (typeof tag === 'string' && (tag.toLowerCase() === 'script' || tag.toLowerCase() === 'img' || tag.toLowerCase() === 'link')) {
          var origSetAttribute = el.setAttribute.bind(el);
          el.setAttribute = function(name, value) {
            if ((name === 'src' || name === 'href') && typeof value === 'string') {
              value = rewrite(value);
            }
            return origSetAttribute(name, value);
          };
        }
        return el;
      };
    })();
  `
  if (doc.head) {
    doc.head.insertBefore(interceptScript, doc.head.firstChild)
  }

  return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML
}

export interface WebPreviewResult {
  src: string
  cleanup: () => void
}

function patchJsContent(jsContent: string, fileMap: Map<string, Blob>): string {
  return jsContent.replace(/(["'])((?:[^"'\\\n]|\\.)+?\.(?:json|png|jpg|jpeg|gif|svg|webp|mp4|webm|ogg|mp3|wav|woff|woff2|ttf|otf|glb|gltf|wasm|atlas|skel))\1/gi, (match, quote, path) => {
    const newPath = normalizeResourcePath(path, '', fileMap)
    if (newPath) {
      return quote + newPath + quote
    }
    return match
  })
}

export async function buildWebPreview(
  fileMap: Map<string, Blob>,
  htmlFileName: string,
  folderHandle?: FileSystemDirectoryHandle | null
): Promise<WebPreviewResult | null> {
  if (folderHandle) {
    previewFolderHandle = folderHandle
  }
  try {
    let htmlBlob = fileMap.get(htmlFileName)
    if (!htmlBlob) {
      for (const [name, blob] of fileMap) {
        if (name.toLowerCase() === htmlFileName.toLowerCase()) {
          htmlBlob = blob
          break
        }
      }
    }

    if (!htmlBlob) {
      console.warn('[webPreview] HTML blob not found:', htmlFileName)
      return null
    }

    const htmlText = await htmlBlob.text()
    const patchedHtml = patchHtmlResources(htmlText, fileMap)

    const fileEntries: [string, Blob][] = []
    for (const [name, blob] of fileMap) {
      if (name.toLowerCase() === htmlFileName.toLowerCase()) {
        continue
      }

      const lowerName = name.toLowerCase()
      if (lowerName.endsWith('.js') || lowerName.endsWith('.mjs')) {
        try {
          const text = await blob.text()
          const patched = patchJsContent(text, fileMap)
          if (patched !== text) {
            fileEntries.push([name, new Blob([patched], { type: 'application/javascript' })])
            continue
          }
        } catch {
        }
      }
      fileEntries.push([name, blob])
    }

    const patchedBlob = new Blob([patchedHtml], { type: 'text/html' })
    fileEntries.push([htmlFileName, patchedBlob])

    await ensureServiceWorker()
    await sendFilesToSW(fileEntries)

    const previewSrc = PREVIEW_PREFIX + encodeURIComponent(htmlFileName)
    return {
      src: previewSrc,
      cleanup: () => {
        clearSWCache()
      }
    }
  } catch (err) {
    console.error('[webPreview] buildWebPreview failed:', err)
    return null
  }
}

export function cleanupWebPreview(): void {
  clearSWCache()
}
