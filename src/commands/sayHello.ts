export const command = 'sayHello [message]'

export const desc = 'Create an empty repo'

export const builder = {
  message: { default: 'world' },
}

export const handler = (argv: { message: any }) => {
  console.log(`Hello ${argv.message}!`)
}
