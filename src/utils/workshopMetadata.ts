import {
  storeWorkshopMetadata,
  getAllWorkshopMetadata,
  type WorkshopMetadata
} from './cache'

export type { WorkshopMetadata }

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

export { getAllWorkshopMetadata }

export function translateContentRating(rating: string): string {
  switch (rating) {
    case 'Everyone': return '大众级'
    case 'Questionable': return '家长指导级'
    case 'Mature': return '限制级'
    default: return '大众级'
  }
}