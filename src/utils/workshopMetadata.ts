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

const DB_NAME = 'WorkshopMetadataDB'
const DB_VERSION = 1
const STORE_NAME = 'metadata'

let db: IDBDatabase | null = null

async function openDB(): Promise<IDBDatabase> {
  if (db) return db
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const database = req.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'workshopId' })
      }
    }
    req.onsuccess = () => {
      db = req.result
      resolve(db)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function storeWorkshopMetadata(metadataList: WorkshopMetadata[]): Promise<void> {
  try {
    const database = await openDB()
    return new Promise((resolve, reject) => {
      const tx = database.transaction([STORE_NAME], 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      for (const meta of metadataList) {
        store.put(meta)
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch { /* ignore */ }
}

const TAGS_RATING = ['Everyone', 'Questionable', 'Mature']

function extractContentRating(tags: string[]): string {
  for (const rating of TAGS_RATING) {
    if (tags.includes(rating)) return rating
  }
  return 'Everyone'
}

export async function loadAndCacheWorkshopCacheJson(fileHandle: FileSystemFileHandle): Promise<WorkshopMetadata[]> {
  const file = await fileHandle.getFile()
  const text = await file.text()
  const data = JSON.parse(text)

  const metadataList: WorkshopMetadata[] = []

  if (data.wallpapers && Array.isArray(data.wallpapers)) {
    for (const wp of data.wallpapers) {
      if (!wp.workshopid) continue

      const tags = wp.tags ? wp.tags.split(',') : []
      const contentRating = extractContentRating(tags)

      metadataList.push({
        workshopId: wp.workshopid,
        title: wp.title || '',
        type: wp.type || '',
        tags,
        contentRating,
        rating: wp.rating,
        ratingRounded: wp.ratingrounded,
        fileSize: wp.filesize,
        fileSizeLabel: wp.filesizelabel,
        favorite: wp.favorite,
        subscriptionDate: wp.subscriptiondate,
        updateDate: wp.updatedate,
        youtube: wp.youtube,
        authorSteamId: wp.authorsteamid,
        allowMobileUpload: wp.allowmobileupload,
        official: wp.official
      })
    }
  }

  if (metadataList.length > 0) {
    await storeWorkshopMetadata(metadataList)
  }

  return metadataList
}

export async function getAllWorkshopMetadata(): Promise<Map<string, WorkshopMetadata>> {
  const result = new Map<string, WorkshopMetadata>()
  try {
    const database = await openDB()
    return new Promise((resolve, reject) => {
      const tx = database.transaction([STORE_NAME], 'readonly')
      const req = tx.objectStore(STORE_NAME).getAll()
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

export function translateContentRating(rating: string): string {
  switch (rating) {
    case 'Everyone': return '大众级'
    case 'Questionable': return '家长指导级'
    case 'Mature': return '限制级'
    default: return '大众级'
  }
}
