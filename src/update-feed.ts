export interface CommandArgs {
  indexHtml: string
  feedPath: string
}

export const runCommand = (args: CommandArgs) => {
  console.log(`-----------`)
  console.log(`Hello ${args.feedPath} ${args.indexHtml}!`)
  console.log(`-----------`)
}
