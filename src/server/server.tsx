import index from './index.html'

const server = Bun.serve({
  routes: {
    '/*': index,

    '/api/hello': {
      async GET(req) {
        return Response.json({
          message: 'Hello, world!',
          method: 'GET',
        })
      },
      async PUT(req) {
        return Response.json({
          message: 'Hello, world!',
          method: 'PUT',
        })
      },
    },
  },

  development: process.env.NODE_ENV !== 'production' && {
    hmr: true,
    console: true,
  },
})

console.log(`🚀 Server running at ${server.url}`)
