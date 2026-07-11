import type { WallpaperItem } from './wallpaperScanner'

const DB_NAME = 'WallpaperBrowserDB'

const STORES = {
  WALLPAPERS: 'wallpapers',
  HANDLES: 'handles',
  METADATA: 'metadata',
  SETTINGS: 'settings',
  THUMBNAILS: 'thumbnails'
}

const REQUIRED_STORES = Object.values(STORES)

const STORE_CONFIG: Record<string, { keyPath: string; indexes?: { name: string; keyPath: string; unique?: boolean }[] }> = {
  [STORES.WALLPAPERS]: {
    keyPath: 'folderName',
    indexes: [
      { name: 'lastModified', keyPath: 'lastModified', unique: false },
      { name: 'category', keyPath: 'category', unique: false }
    ]
  },
  [STORES.METADATA]: {
    keyPath: 'workshopId',
    indexes: [
      { name: 'subscriptionDate', keyPath: 'subscriptionDate', unique: false }
    ]
  },
  [STORES.HANDLES]: {
    keyPath: 'key'
  },
  [STORES.SETTINGS]: {
    keyPath: 'key'
  },
  [STORES.THUMBNAILS]: {
    keyPath: 'folderName'
  }
}

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
  fileNames: string[]
  coverFileName: string
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

export interface WorkshopMetadata {
  workshopId: string
  title: string
  type: string
  tags: string[]
  contentRating: string
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

interface Settings {
  key: string
  value: any
}

let db: IDBDatabase | null = null

function createStoreIfNeeded(database: IDBDatabase, name: string) {
  if (!database.objectStoreNames.contains(name)) {
    const config = STORE_CONFIG[name]
    if (config) {
      const store = database.createObjectStore(name, { keyPath: config.keyPath })
      if (config.indexes) {
        for (const idx of config.indexes) {
          store.createIndex(idx.name, idx.keyPath, { unique: idx.unique ?? false })
        }
      }
    }
  }
}

function ensureIndexesForStore(database: IDBDatabase, name: string): boolean {
  if (!database.objectStoreNames.contains(name)) return false

  const config = STORE_CONFIG[name]
  if (!config || !config.indexes) return false

  const store = database.transaction(name, 'readonly').objectStore(name)
  let addedIndex = false

  for (const idx of config.indexes) {
    if (!store.indexNames.contains(idx.name)) {
      addedIndex = true
      break
    }
  }

  return addedIndex
}

function hasAllStores(database: IDBDatabase): boolean {
  return REQUIRED_STORES.every(s => database.objectStoreNames.contains(s))
}

function needsUpgrade(database: IDBDatabase): boolean {
  if (!hasAllStores(database)) return true

  for (const storeName of REQUIRED_STORES) {
    if (ensureIndexesForStore(database, storeName)) {
      return true
    }
  }

  return false
}

async function openDB(): Promise<IDBDatabase> {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME)

    request.onerror = () => reject(request.error)

    request.onsuccess = () => {
      const database = request.result

      if (!needsUpgrade(database)) {
        db = database
        resolve(db)
        return
      }

      const newVersion = database.version + 1
      database.close()

      const upgradeRequest = indexedDB.open(DB_NAME, newVersion)

      upgradeRequest.onerror = () => reject(upgradeRequest.error)

      upgradeRequest.onupgradeneeded = (event) => {
        const dbToUpgrade = (event.target as IDBOpenDBRequest).result
        const tx = (event.target as IDBOpenDBRequest).transaction
        for (const storeName of REQUIRED_STORES) {
          createStoreIfNeeded(dbToUpgrade, storeName)
          const config = STORE_CONFIG[storeName]
          if (config && config.indexes && dbToUpgrade.objectStoreNames.contains(storeName)) {
            const store = tx!.objectStore(storeName)
            for (const idx of config.indexes) {
              if (!store.indexNames.contains(idx.name)) {
                store.createIndex(idx.name, idx.keyPath, { unique: idx.unique ?? false })
              }
            }
          }
        }
      }

      upgradeRequest.onsuccess = () => {
        db = upgradeRequest.result
        resolve(db)
      }
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result
      const tx = (event.target as IDBOpenDBRequest).transaction
      for (const storeName of REQUIRED_STORES) {
        createStoreIfNeeded(database, storeName)
        const config = STORE_CONFIG[storeName]
        if (config && config.indexes && database.objectStoreNames.contains(storeName)) {
          const store = tx!.objectStore(storeName)
          for (const idx of config.indexes) {
            if (!store.indexNames.contains(idx.name)) {
              store.createIndex(idx.name, idx.keyPath, { unique: idx.unique ?? false })
            }
          }
        }
      }
    }
  })
}

export async function getCachedWallpapers(): Promise<CachedWallpaper[]> {
  try {
    const database = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORES.WALLPAPERS], 'readonly')
      const store = transaction.objectStore(STORES.WALLPAPERS)
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
      const transaction = database.transaction([STORES.WALLPAPERS], 'readwrite')
      const store = transaction.objectStore(STORES.WALLPAPERS)

      const folderNameSet = new Set(wallpapers.map(wp => wp.folderName))
      const existingKeysReq = store.getAllKeys()
      existingKeysReq.onsuccess = () => {
        const existingKeys = existingKeysReq.result as string[]
        for (const key of existingKeys) {
          if (!folderNameSet.has(key)) {
            store.delete(key)
          }
        }

        const cachedAt = Date.now()
        for (const wp of wallpapers) {
          const coverFileName = wp.coverFileHandle?.name || wp.previewFile || ''
          const cached: CachedWallpaper = {
            folderName: wp.folderName,
            name: wp.name,
            category: wp.category,
            type: wp.type,
            tags: [...wp.tags],
            description: wp.description,
            workshopId: wp.workshopId,
            previewFile: wp.previewFile,
            mainFile: wp.mainFile,
            schemeColor: wp.schemeColor,
            contentRating: wp.contentRating,
            visibility: wp.visibility,
            lastModified: wp.lastModified,
            cachedAt,
            fileNames: wp.files.map(f => f.name),
            coverFileName,
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
        }
      }

      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => resolve()
    })
  } catch {
  }
}

export async function cacheSingleWallpaper(wp: WallpaperItem): Promise<void> {
  try {
    const database = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORES.WALLPAPERS], 'readwrite')
      const store = transaction.objectStore(STORES.WALLPAPERS)
      const coverFileName = wp.coverFileHandle?.name || wp.previewFile || ''
      const cached: CachedWallpaper = {
        folderName: wp.folderName,
        name: wp.name,
        category: wp.category,
        type: wp.type,
        tags: [...wp.tags],
        description: wp.description,
        workshopId: wp.workshopId,
        previewFile: wp.previewFile,
        mainFile: wp.mainFile,
        schemeColor: wp.schemeColor,
        contentRating: wp.contentRating,
        visibility: wp.visibility,
        lastModified: wp.lastModified,
        cachedAt: Date.now(),
        fileNames: wp.files.map(f => f.name),
        coverFileName,
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
      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => resolve()
    })
  } catch {
  }
}

export async function cacheSingleDirectoryHandle(name: string, handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const database = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORES.HANDLES], 'readwrite')
      transaction.objectStore(STORES.HANDLES).put({ key: name, handle })
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
      const transaction = database.transaction([STORES.WALLPAPERS], 'readonly')
      const store = transaction.objectStore(STORES.WALLPAPERS)
      const request = store.get(folderName)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
    })
  } catch {
    return null
  }
}

export async function deleteCachedWallpaper(folderName: string): Promise<void> {
  try {
    const database = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORES.WALLPAPERS], 'readwrite')
      const store = transaction.objectStore(STORES.WALLPAPERS)
      const request = store.delete(folderName)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  } catch {
  }
}

export async function clearCache(): Promise<void> {
  try {
    const database = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(Object.values(STORES), 'readwrite')
      for (const storeName of Object.values(STORES)) {
        transaction.objectStore(storeName).clear()
      }
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
      const transaction = database.transaction([STORES.HANDLES], 'readwrite')
      const store = transaction.objectStore(STORES.HANDLES)
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
      const transaction = database.transaction([STORES.HANDLES], 'readonly')
      const store = transaction.objectStore(STORES.HANDLES)
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

export async function deleteCachedDirectoryHandle(key: string): Promise<void> {
  try {
    const database = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORES.HANDLES], 'readwrite')
      const store = transaction.objectStore(STORES.HANDLES)
      const request = store.delete(key)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  } catch {
  }
}

export async function storeWorkshopMetadata(metadataList: WorkshopMetadata[]): Promise<void> {
  try {
    const database = await openDB()
    return new Promise((resolve, reject) => {
      const tx = database.transaction([STORES.METADATA], 'readwrite')
      const store = tx.objectStore(STORES.METADATA)
      for (const meta of metadataList) {
        store.put(meta)
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
  }
}

export async function getAllWorkshopMetadata(): Promise<Map<string, WorkshopMetadata>> {
  const result = new Map<string, WorkshopMetadata>()
  try {
    const database = await openDB()
    return new Promise((resolve, reject) => {
      const tx = database.transaction([STORES.METADATA], 'readonly')
      const req = tx.objectStore(STORES.METADATA).getAll()
      req.onsuccess = () => {
        const items = req.result as WorkshopMetadata[]
        for (const item of items) {
          result.set(item.workshopId, item)
        }
        resolve(result)
      }
      req.onerror = () => reject(req.error)
    })
  } catch {
    return result
  }
}

export async function getWorkshopMetadata(workshopId: string): Promise<WorkshopMetadata | null> {
  try {
    const database = await openDB()
    return new Promise((resolve, reject) => {
      const tx = database.transaction([STORES.METADATA], 'readonly')
      const req = tx.objectStore(STORES.METADATA).get(workshopId)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

export async function getSetting<T>(key: string, defaultValue?: T): Promise<T | undefined> {
  try {
    const database = await openDB()
    return new Promise((resolve, reject) => {
      const tx = database.transaction([STORES.SETTINGS], 'readonly')
      const req = tx.objectStore(STORES.SETTINGS).get(key)
      req.onsuccess = () => {
        const result = req.result as Settings | undefined
        resolve(result ? result.value : defaultValue)
      }
      req.onerror = () => reject(req.error)
    })
  } catch {
    return defaultValue
  }
}

export async function setSetting(key: string, value: any): Promise<void> {
  try {
    const database = await openDB()
    return new Promise((resolve, reject) => {
      const tx = database.transaction([STORES.SETTINGS], 'readwrite')
      tx.objectStore(STORES.SETTINGS).put({ key, value })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
  }
}

// Cache cover thumbnail Blob in IndexedDB for offline access
export async function cacheThumbnail(folderName: string, blob: Blob): Promise<void> {
  try {
    const database = await openDB()
    return new Promise((resolve, reject) => {
      const tx = database.transaction([STORES.THUMBNAILS], 'readwrite')
      tx.objectStore(STORES.THUMBNAILS).put({ folderName, blob, cachedAt: Date.now() })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
  }
}

export async function getCachedThumbnail(folderName: string): Promise<Blob | null> {
  try {
    const database = await openDB()
    return new Promise((resolve, reject) => {
      const tx = database.transaction([STORES.THUMBNAILS], 'readonly')
      const req = tx.objectStore(STORES.THUMBNAILS).get(folderName)
      req.onsuccess = () => {
        const result = req.result
        resolve(result ? result.blob : null)
      }
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

export async function clearThumbnails(): Promise<void> {
  try {
    const database = await openDB()
    return new Promise((resolve, reject) => {
      const tx = database.transaction([STORES.THUMBNAILS], 'readwrite')
      tx.objectStore(STORES.THUMBNAILS).clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
  }
}