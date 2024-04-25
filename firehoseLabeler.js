import {
  AppBskyFeedPost,
  BskyAgent,
} from '@atproto/api'

import {
  ComAtprotoSyncSubscribeRepos,
  subscribeRepos,
  // SubscribeReposMessage,
} from 'atproto-firehose'

import AltTextAutoLabeler from './altTextAutoLabeler.js'

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

const ph = new AltTextAutoLabeler(agent, {minimumFollowersCount})

const handleMessage = (message) => {
  if (ComAtprotoSyncSubscribeRepos.isCommit(message)) {
    const repo = message.repo
    for (const op of message.ops)
      if (AppBskyFeedPost.isRecord(op?.payload))
        ph.handlePost(op.payload, repo,
          `at://${message.repo}/${op.path}`,
          op.cid?.toString())
  }
}

const firehose = subscribeRepos('wss://bsky.network', {
  decodeRepoOps: true,
})
firehose.on('message', handleMessage)
