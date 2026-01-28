import { health } from '../routes/health.js'
import { redactPiiRequestHandlers } from '../routes/redact-pii.js'
import { supportRoutes } from '../routes/support/support-routes.js'

const router = {
  plugin: {
    name: 'router',
    register: (server, _options) => {
      server.route([health, ...redactPiiRequestHandlers, ...supportRoutes])
    }
  }
}

export { router }
