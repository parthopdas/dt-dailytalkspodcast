import * as yargs from 'yargs'

yargs
  .commandDir('commands', { extensions: ['ts', 'js'] })
  .demandCommand()
  .alias('help', 'h')
  .alias('version', 'V')
  .parse(process.argv.slice(2))
