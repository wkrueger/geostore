import { createContextMapper } from "@proerd/nextpress-context";

export const serverContext = createContextMapper({
  id: 'server',
  envKeys: ['SERVER_PORT'],
  optionalKeys: ['SERVER_PORT'],
  envContext({ getKey }) {
    return {
      server: {
        port: getKey('SERVER_PORT') || 3000
      }
    }
  }
})

declare global {
  namespace Nextpress {
    interface CustomContext extends ReturnType<typeof serverContext['envContext']> { }
  }
}
