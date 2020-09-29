import { runCommand } from '../update-feed'

export const command = 'update-feed [indexHtml] [feedPath]'

export const desc = 'Update the podcast feed with new entries from index.html'

export const builder = {
  indexHtml: { default: 'https://www.dhammatalks.org/mp3_index.html' },
  feedPath: { default: './evening.xml' },
}

export const handler = runCommand
