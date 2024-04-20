import {
  AppBskyEmbedImages,
  AppBskyEmbedRecordWithMedia,
} from '@atproto/api'

// function to test if any of a post's images lack alt text
const hasNoAltText = (images) => {
  for (const image of images)
    if (!image.alt) return true
  return false
}

// some known-bad alt text entries
const junkSet = new Set([
  'image', 'pic', 'pics', 'picture', 'photo',
  'meme', 'wtf', 'omg', 'lol', 'asdf', 'thing',
  'art', 'content', 'alt', 'text', 'alt text',
  'note', 'words', 'test'
])

// remove articles and punctuation from the ends of the string
const trimFat = (str) =>
  str.replace(/^[\s\p{P}]*(?:a|an|the|some|this|that|more)?[\s\p{P}]*(.*[^\s\p{P}])[\s\p{P}]*$/u,'$1')

// function to test if any of a post's images' alt text are lacking
const hasJunkAltText = (images) => {
  for (const image of images) {
    const trimmed = trimFat(image.alt)
    if (image.alt && (!trimmed || junkSet.has(trimmed.toLowerCase())))
      return true
  }
  return false
}

const imagesFromPost = (post) => {
  if (AppBskyEmbedImages.isMain(post.embed))
    return post.embed.images
  else if (AppBskyEmbedRecordWithMedia.isMain(post.embed) &&
    AppBskyEmbedImages.isMain(post.embed.media))
    return post.embed.media.images
  else return null
}

export default class PostHandler {
  constructor(agent, opts) {
    this.agent = agent
    // emit events using a proxy with the labeler service identifier
    this.labeler = agent.withProxy('atproto_labeler', agent.session.did)
    this.minimumFollowersCount = opts?.minimumFollowersCount
  }

  labelPost(label, uri, cid) {
    const dry = process.env.DRY_RUN?.includes('label')

    if (process.env.LOG_POINTS?.includes('label'))
      console.log(`${dry ? 'detecting' : 'labeling'} ${label}: ${uri}`)

    // emit an Ozone moderation event
    if (!dry)
    return this.labeler.api.tools.ozone.moderation.emitEvent({
      // specify the label event
      event: {
        $type: 'tools.ozone.moderation.defs#modEventLabel',
        createLabelVals: [label],
        negateLabelVals: [],
      },
      // specify the labeled post by strongRef
      subject: {
        $type: 'com.atproto.repo.strongRef',
        uri, cid
      },
      // put in the rest of the metadata
      createdBy: this.agent.session.did,
      createdAt: new Date().toISOString(),
      subjectBlobCids: [],
    })
  }

  autoLabelPostImages (images, uri, cid) {
    let labeled = false

    if (hasNoAltText(images)) {
      this.labelPost('no-alt-text', uri, cid)
      labeled = true
    }

    // this isn't an else-if, because it's possible for a post to have
    // junk alt text on some embedded images and no alt text on others
    if (hasJunkAltText(images)) {
      this.labelPost('non-alt-text', uri, cid)
      labeled = true
    }

    return labeled
  }

  // function to apply any necessary labels to a post
  async handlePost (post, repo, uri, cid) {
    if (!cid) return
    if (process.env.LOG_POINTS?.includes('post'))
      console.log(`checking post: ${uri}`)

    const images = imagesFromPost(post)

    if (images) {
      if (process.env.LOG_POINTS?.includes('image'))
        console.log(`post has images: ${uri}`)

      if (this.minimumFollowersCount) {
        const authorProfile = (await
          agent.app.bsky.actor.getProfile({actor: repo})).data
        const followersCount = authorProfile.followersCount
        if (process.env.LOG_POINTS?.includes('followers'))
          console.log(`${followersCount} following author of ${uri}`)
        if (followersCount >= this.minimumFollowersCount)
          return this.autoLabelPostImages(images, uri, cid)
      } else return this.autoLabelPostImages(images, uri, cid)
    }
  }
}
