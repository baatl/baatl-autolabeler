import {
  AppBskyEmbedImages,
  AppBskyEmbedRecordWithMedia,
  AppBskyFeedPost,
  BskyAgent,
} from '@atproto/api'

import {
  ComAtprotoSyncSubscribeRepos,
  subscribeRepos,
  // SubscribeReposMessage,
} from 'atproto-firehose'

// the base agent for logging in to submit labels
const agent = new BskyAgent({
  service: 'https://bsky.social/',
})

// don't do anything until we're logged in
await agent.login({
  identifier: process.env.BSKY_HANDLE ?? '',
  password: process.env.BSKY_PASSWORD ?? '',
})

const MINIMUM_FOLLOWERS = process.env.MINIMUM_FOLLOWERS ?? ''
const minimumFollowersCount = MINIMUM_FOLLOWERS ?
  parseInt(MINIMUM_FOLLOWERS) : 0

// emit events using a proxy with the labeler service identifier
const labeler = agent.withProxy('atproto_labeler', agent.session.did)

// function to apply a given label to a given host
const labelPost = (label, uri, cid) => {
  const dry = process.env.DRY_RUN?.includes('label')

  if (process.env.LOG_POINTS?.includes('label'))
    console.log(`${dry ? 'detecting' : 'labeling'} ${label}: ${uri}`)

  // emit an Ozone moderation event
  if (!dry)
  return labeler.api.tools.ozone.moderation.emitEvent({
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
    createdBy: agent.session.did,
    createdAt: new Date().toISOString(),
    subjectBlobCids: [],
  })
}

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
    if (image.alt && (!trimmed
      || junkSet.has(trimmed.toLowerCase())))
      return true
  }
  return false
}

const handlePostImages = (images, uri, cid) => {
  if (hasNoAltText(images)) {
    labelPost('no-alt-text', uri, cid)
  }

  // this isn't an else-if, because it's possible for a post to have
  // junk alt text on some embedded images and no alt text on others
  if (hasJunkAltText(images))
    labelPost('non-alt-text', uri, cid)
}

const imagesFromPost = (post) => {
  if (AppBskyEmbedImages.isMain(post.embed))
    return post.embed.images
  else if (AppBskyEmbedRecordWithMedia.isMain(post.embed) &&
    AppBskyEmbedImages.isMain(post.embed.media))
    return post.embed.media.images
  else return null
}

// function to apply any necessary labels to a post
const handlePost = async (post, repo, uri, cid) => {
  if (!cid) return
  if (process.env.LOG_POINTS?.includes('post'))
    console.log(`checking post: ${uri}`)

  const images = imagesFromPost(post)

  if (images) {
    if (process.env.LOG_POINTS?.includes('image'))
      console.log(`post has images: ${uri}`)

    if (MINIMUM_FOLLOWERS) {
      const authorProfile = (await
        agent.app.bsky.actor.getProfile({actor: repo})).data
      const followersCount = authorProfile.followersCount
      if (process.env.LOG_POINTS?.includes('followers'))
        console.log(`${followersCount} following author of ${uri}`)
      if (followersCount >= minimumFollowersCount)
        handlePostImages(images, uri, cid)
    } else return handlePostImages(images, uri, cid)
  }
}

const handleMessage = (message) => {
  if (ComAtprotoSyncSubscribeRepos.isCommit(message)) {
    const repo = message.repo
    for (const op of message.ops)
      if (AppBskyFeedPost.isRecord(op?.payload))
        handlePost(op.payload, repo,
          `at://${message.repo}/${op.path}`,
          op.cid?.toString())
  }
}

const firehose = subscribeRepos('wss://bsky.network', {
  decodeRepoOps: true,
})
firehose.on('message', handleMessage)
