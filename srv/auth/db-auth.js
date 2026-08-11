const cds = require('@sap/cds')
const bcrypt = require('bcryptjs')

/**
 * Custom HTTP Basic Authentication strategy that verifies credentials
 * against the `ideamanagement.db.Users` table (real users, hashed passwords),
 * instead of the static `cds.requires.auth.users` mock list.
 *
 * Roles are derived from the `role` field on the Users entity:
 * - 'MANAGER'    -> roles: ['Manager', 'authenticated-user']
 * - 'SUBMITTER'  -> roles: ['Submitter', 'authenticated-user']
 */
module.exports = function db_basic_auth(options) {
  const DEBUG = cds.debug('basic|auth')
  const login_required = options.login_required || process.env.NODE_ENV === 'production'

  return async function db_basic_auth(req, res, next) {
    req._login = login
    const auth = req.headers.authorization
    if (!auth?.match(/^basic/i)) return login_required ? req._login() : next()

    const [id, pwd] = Buffer.from(auth.slice(6), 'base64').toString().split(':')

    try {
      const db = await cds.connect.to('db')
      const record = await db.run(
        SELECT.one.from('ideamanagement.db.Users').where({ username: id })
      )

      if (!record || !bcrypt.compareSync(pwd || '', record.password)) {
        DEBUG?.(`authentication failed for user '${id}'`)
        return req._login()
      }

      const roles = record.role === 'MANAGER'
        ? ['Manager', 'authenticated-user']
        : ['Submitter', 'authenticated-user']

      const u = new cds.User({ id: record.username, roles, attr: { title: record.title } })
      let ctx = cds.context
      ctx.user = req.user = u
      DEBUG?.('authenticated:', { user: u.id, roles })
      next()
    } catch (e) {
      DEBUG?.('authentication error:', e)
      return req._login()
    }
  }

  function login() {
    DEBUG?.(401, '> login required')
    return this.res.set('WWW-Authenticate', `Basic realm="Users"`).sendStatus(401)
  }
}
