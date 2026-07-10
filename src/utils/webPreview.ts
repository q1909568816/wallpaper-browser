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
let swReadyResolve: (() => void) | null = null
let swReadyPromise: Promise<void> | null = null

async function ensureServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return

  if (swRegistration) {
    const sw = swRegistration.active || swRegistration.waiting || swRegistration.installing
    if (sw?.state === 'activated') return
  }

  if (swReadyPromise) return swReadyPromise

  swReadyPromise = new Promise((resolve) => {
    swReadyResolve = resolve
  })

  try {
    swRegistration = await navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw-preview.js', { scope: import.meta.env.BASE_URL || '/' })
    const sw = swRegistration.active || swRegistration.waiting || swRegistration.installing
    if (sw && sw.state === 'activated') {
      swReadyResolve?.()
    } else {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        swReadyResolve?.()
      })
    }
  } catch {
    swReadyResolve?.()
  }

  return swReadyPromise
}

function sendFilesToSW(files: [string, Blob][]): void {
  if (!swRegistration?.active) return
  swRegistration.active.postMessage({ type: 'init', files })
}

function clearSWCache(): void {
  if (!swRegistration?.active) return
  swRegistration.active.postMessage({ type: 'clear' })
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

  // inject <base> so ALL relative URLs (including JS dynamic ones) resolve to SW prefix
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

  return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML
}

export interface WebPreviewResult {
  srcdoc: string
  cleanup: () => void
}

export async function buildWebPreview(
  fileMap: Map<string, Blob>,
  htmlFileName: string
): Promise<WebPreviewResult | null> {
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

    if (!htmlBlob) return null

    const htmlText = await htmlBlob.text()
    const patchedHtml = patchHtmlResources(htmlText, fileMap)

    const fileEntries: [string, Blob][] = []
    for (const [name, blob] of fileMap) {
      if (name.toLowerCase() !== htmlFileName.toLowerCase()) {
        fileEntries.push([name, blob])
      }
    }

    await ensureServiceWorker()
    sendFilesToSW(fileEntries)

    return {
      srcdoc: patchedHtml,
      cleanup: () => {
        clearSWCache()
      }
    }
  } catch {
    return null
  }
}

export function cleanupWebPreview(): void {
  clearSWCache()
  swReadyPromise = null
  swReadyResolve = null
}
