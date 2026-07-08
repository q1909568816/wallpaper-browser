import type { WallpaperItem } from './wallpaperScanner'

const DB_NAME = 'WallpaperBrowserDB'
const DB_VERSION = 3
const STORE_NAME = 'wallpapers'
const HANDLES_STORE = 'handles'

interface CachedWallpaper {
  folderName: string
  name: string
  category: string
  type: string
  tags: string[]
  description: string
  workshopId: string
  previewFile: string
  mainFile: string
  schemeColor: string
  contentRating: string
  visibility: string
  lastModified: number
  cachedAt: number
  rating?: number
  ratingRounded?: number
  fileSize?: number
  fileSizeLabel?: string
  favorite?: boolean
  subscriptionDate?: number
  updateDate?: number
  youtube?: string
  authorSteamId?: string
  allowMobileUpload?: boolean
  official?: boolean
}

let db: IDBDatabase | null = null

async function openDB(): Promise<IDBDatabase> {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)

    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'folderName' })
        store.createIndex('lastModified', 'lastModified', { unique: false })
        store.createIndex('category', 'category', { unique: false })
      }
      if (!database.objectStoreNames.contains(HANDLES_STORE)) {
        database.createObjectStore(HANDLES_STORE, { keyPath: 'key' })
      }
    }
  })
}

export async function getCachedWallpapers(): Promise<CachedWallpaper[]> {
  try {
    const database = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || [])
    })
  } catch {
    return []
  }
}

export async function cacheWallpapers(wallpapers: WallpaperItem[]): Promise<void> {
  try {
    const database = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

      const cachedAt = Date.now()
      wallpapers.forEach(wp => {
        const cached: CachedWallpaper = {
          folderName: wp.folderName,
          name: wp.name,
          category: wp.category,
          type: wp.type,
          tags: wp.tags,
          description: wp.description,
          workshopId: wp.workshopId,
          previewFile: wp.previewFile,
          mainFile: wp.mainFile,
          schemeColor: wp.schemeColor,
          contentRating: wp.contentRating,
          visibility: wp.visibility,
          lastModified: wp.lastModified,
          cachedAt,
          rating: wp.rating,
          ratingRounded: wp.ratingRounded,
          fileSize: wp.fileSize,
          fileSizeLabel: wp.fileSizeLabel,
          favorite: wp.favorite,
          subscriptionDate: wp.subscriptionDate,
          updateDate: wp.updateDate,
          youtube: wp.youtube,
          authorSteamId: wp.authorSteamId,
          allowMobileUpload: wp.allowMobileUpload,
          official: wp.official
        }
        store.put(cached)
      })

      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => resolve()
    })
  } catch {
  }
}

export async function getCachedWallpaper(folderName: string): Promise<CachedWallpaper | null> {
  try {
    const database = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(folderName)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
    })
  } catch {
    return null
  }
}

export async function clearCache(): Promise<void> {
  try {
    const database = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME, HANDLES_STORE], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const handlesStore = transaction.objectStore(HANDLES_STORE)
      store.clear()
      handlesStore.clear()
      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => resolve()
    })
  } catch {
  }
}

export async function cacheDirectoryHandles(handles: Map<string, FileSystemDirectoryHandle>): Promise<void> {
  try {
    const database = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([HANDLES_STORE], 'readwrite')
      const store = transaction.objectStore(HANDLES_STORE)
      for (const [name, handle] of handles) {
        store.put({ key: name, handle })
      }
      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => resolve()
    })
  } catch {
  }
}

export async function getCachedDirectoryHandles(): Promise<{ handleMap: Map<string, FileSystemDirectoryHandle>; count: number }> {
  try {
    const database = await openDB()
    const entries: { key: string; handle: FileSystemDirectoryHandle }[] = await new Promise((resolve, reject) => {
      const transaction = database.transaction([HANDLES_STORE], 'readonly')
      const store = transaction.objectStore(HANDLES_STORE)
      const request = store.getAll()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || [])
    })
    const handleMap = new Map<string, FileSystemDirectoryHandle>()
    for (const e of entries) {
      if (e.handle) handleMap.set(e.key, e.handle)
    }
    return { handleMap, count: handleMap.size }
  } catch {
    return { handleMap: new Map(), count: 0 }
  }
}
