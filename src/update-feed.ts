import * as axios from 'axios'
import * as cheerio from 'cheerio'
import * as xmlParser from 'fast-xml-parser'
import * as fs from 'fs'
import * as util from 'util'
import md5 from 'md5'
import moment from 'moment'
import logger from './logger'
import * as podcasts from './podcast.types'

/*

- read url + desc
- validate ensure errors in format matching are ignored and logged out
- create feedItem structure for each
- write all feed url structure
- validate rssfeed
 */

const episodePathCracker = /^https.*\/Archive\/y(\d{4})\/\d{2}(\d{2})(\d{2}).*$/i

export interface CommandArgs {
  indexHtml: string
  feedPath: string
}

interface FeedInfo {
  index: number
  url: string
  description: string
}

const getDescription = (e: cheerio.Cheerio) =>
  e
    .children()
    .remove()
    .end()
    .text()
    .trim()
    .replace(/&/gi, '&amp;') // TODO: Do this for all unsafe characters

const getPath = (e: cheerio.Cheerio) =>
  e
    .attr('href')
    ?.trim()
    ?.replace(/&/gi, '%26') // TODO: Do this for all unsafe characters

const getFeedInfo = async (indexHtml: string) => {
  const response = await axios.default.get(indexHtml)
  const $ = cheerio.load(response.data, { xmlMode: true })

  const fi = $('li a.audio')
    .map((i, e) => ({
      index: i,
      url: `https://www.dhammatalks.org${getPath($(e))}`,
      description: getDescription($(e)),
    }))
    .get()

  logger.info(`Obtained ${fi.length} items from indexHtml`)
  logger.info(`... First element: ${JSON.stringify(fi[0])}`)

  return fi
}

const validateFeedInfo = (feedInfo: FeedInfo): boolean => {
  if (feedInfo.url == null || feedInfo.description == null) {
    logger.warn(`Validation: Item #${feedInfo.index} has empty path or description`)
    return false
  }

  if (!episodePathCracker.test(feedInfo.url)) {
    logger.warn(`Validation: Item #${feedInfo.index} has invalid path specification: ${feedInfo.url}`)
    return false
  }

  return true
}

const createEpisode = (fi: FeedInfo): podcasts.Episode => {
  const pathMatch = fi.url.match(episodePathCracker) ?? []

  const pubDate = moment(new Date(parseInt(pathMatch[1], 10), parseInt(pathMatch[2], 10), parseInt(pathMatch[3], 10)))

  return {
    guid: md5(fi.url),
    title: fi.description,
    pubDate: pubDate.toString(),
    description: fi.description,
    audioUrl: fi.url,
    audioSize: 114278400, // TODO
    audioType: 'audio/mpeg',
    contentEncoded: 'TODO', // TODO
    subtitle: 'TODO', // TODO
    link: fi.url,
    duration: 900, // TODO
    categories: ['Buddhism', 'Dhamma', 'Metta Forest', 'Thanissaro Bhikkhu'],
    episode: parseInt(pathMatch[1], 10) * 10000 + parseInt(pathMatch[2], 10) * 100 + parseInt(pathMatch[3], 10),
    season: parseInt(pathMatch[1], 10),
  }
}

const createPodcastFeed = (episodes: podcasts.Episode[]): any => {
  logger.info(`Creating podcast with ${episodes.length} items`)

  const podcast = <podcasts.Podcast>{
    title: 'Evening talks by Thanissaro Bhikkhu',
    description:
      'These were given by Thanissaro Bhikkhu during the evening meditation sessions at Metta Forest Monastery, Valley Center CA.',
    imageUrl: 'https://www.dhammatalks.org/images/dto_logo_160x680.png',
    category: 'Religion &amp; Spirituality',
    subcategory: 'Buddhism',
    author: 'Thanissaro Bhikkhu',
    ownerName: 'dhammatalks.org',
    ownerEmail: 'dhammatalks.feedback@gmail.com',
    episodes,
    lastBuildDate: moment().toString(),
    link: 'https://www.dhammatalks.org/mp3_index.html',
    itunesLink: undefined, // TODO
    spotifyLink: undefined, // TODO
    googleLink: undefined, // TODO
    atomLink: 'http://cdn.sibilly.com/dhammatalks/evening.xml',
    language: 'en-us',
    type: 'serial',
    // complete: 'Yes' | any
  }

  return {
    rss: {
      '@_version': '2.0',
      '@_xmlns:content': 'http://purl.org/rss/1.0/modules/content/',
      // '@_xmlns:sy': 'http://purl.org/rss/1.0/modules/syndication/',,
      '@_xmlns:atom': 'http://www.w3.org/2005/Atom',
      '@_xmlns:itunes': 'http://www.itunes.com/dtds/podcast-1.0.dtd',
      '@_xmlns:googleplay': 'http://www.google.com/schemas/play-podcasts/1.0',
      channel: {
        title: podcast.title,
        description: podcast.description,
        'itunes:image': {
          '@_href': podcast.imageUrl,
        },
        image: {
          url: podcast.imageUrl,
          title: podcast.title,
          link: podcast.link,
        },
        language: podcast.language || 'en-us',
        'itunes:category': {
          '@_text': podcast.category,
          'itunes:category': {
            '@_text': podcast.subcategory,
          },
        },
        'itunes:explicit': false,
        'itunes:author': podcast.author,
        link: podcast.link,
        'itunes:owner': {
          'itunes:name': podcast.ownerName,
          'itunes:email': podcast.ownerEmail,
        },
        ...(podcast.atomLink && {
          'atom:link': {
            '@_rel': 'self',
            '@_type': 'application/rss+xml',
            '@_href': podcast.atomLink,
          },
        }),
        ...(podcast.type && { 'itunes:type': podcast.type }),
        // TODO: reactivate once needed
        // ...(podcast.complete && { 'itunes:complete': podcast.complete }),
        lastBuildDate: moment.utc().format('ddd, DD MMM YYYY HH:mm:ss ZZ'),
        item: podcast.episodes.map(episode => ({
          guid: {
            '@_isPermaLink': false,
            '#text': episode.guid,
          },
          pubDate: episode.pubDate,
          title: episode.title,
          'itunes:title': episode.title,
          'itunes:author': podcast.author,
          description: episode.description,
          ...(episode.contentEncoded && { 'content:encoded': episode.contentEncoded }),
          ...(episode.subtitle && { 'itunes:subtitle': episode.subtitle }),
          enclosure: {
            '@_url': episode.audioUrl,
            '@_length': episode.audioSize,
            '@_type': episode.audioType,
          },
          'itunes:duration': episode.duration || 0,
          'itunes:explicit': false,
          'itunes:episodeType': 'full',
          ...(episode.categories && { category: episode.categories }),
          ...(episode.link && { link: episode.link }),
          ...(episode.episode && { 'itunes:episode': episode.episode }),
          ...(podcast.type && podcast.type === 'serial' && episode.episode && { 'itunes:order': episode.episode }),
          ...(episode.season && { 'itunes:season': episode.season }),
        })),
      },
    },
  }
}

const writeFeed = async (feed: string, feedPath: string) => {
  // eslint-disable-next-line new-cap
  const parser = new xmlParser.j2xParser({
    ignoreAttributes: false,
    format: true,
  })

  const xml = parser.parse(feed)
  await util.promisify(fs.writeFile)(feedPath, `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`)
  logger.info(`Done creating podcast rss feed at ${feedPath}`)
}

export const runCommand = async (args: CommandArgs) => {
  logger.info('------------------------------')
  logger.info(`Executing with feedPath=${args.feedPath} indexHtml=${args.indexHtml}`)
  logger.info('------------------------------')

  const fi = await getFeedInfo(args.indexHtml)
  const episodes = fi.filter(validateFeedInfo).map(createEpisode)
  const feed = createPodcastFeed(episodes)
  writeFeed(feed, args.feedPath)
}
