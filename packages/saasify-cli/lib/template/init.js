'use strict'

const handlebars = require('handlebars')
const execa = require('execa')
const fs = require('fs-extra')
const gitClone = require('git-clone')
const globby = require('globby')
const path = require('path')
const pEachSeries = require('p-each-series')
const pify = require('pify')
const tempy = require('tempy')

const spinner = require('../spinner')
const pkg = require('../../package')

const templateRepo = 'https://github.com/saasify-sh/saasify.git'

module.exports = async (opts) => {
  const {
    force,
    git,
    template,
    dest = path.join(process.cwd(), opts.name)
  } = opts

  const exists = await fs.pathExists(dest)
  if (exists && !force) {
    throw new Error(`Error destination path exists ${dest}`)
  }

  const temp = tempy.directory()
  await spinner(
    pify(gitClone)(templateRepo, temp, {
      shallow: true
    }),
    `Cloning "${template}" template`
  )

  const source = path.join(temp, 'templates', template)
  // TODO: verify source template exists
  const files = await globby(source, { dot: true })
  // TODO: verify that source files is non-empty

  await fs.mkdirp(dest)

  await spinner(
    pEachSeries(files, async (file) => {
      return module.exports.copyTemplateFile({
        ...opts,
        file,
        source,
        dest
      })
    }),
    `Copying "${template}" template to ${dest}`
  )

  if (git) {
    await spinner(
      module.exports.initGitRepo({
        ...opts,
        dest
      }),
      'Initializing git repo'
    )
  }

  return dest
}

module.exports.copyTemplateFile = async (opts) => {
  const {
    file,
    source,
    dest
  } = opts

  const fileRelativePath = path.relative(source, file)
  const destFilePath = path.join(dest, fileRelativePath)
  const destFileDir = path.parse(destFilePath).dir

  await fs.mkdirp(destFileDir)

  const sourceFile = await fs.readFile(file, 'utf8')
  const template = handlebars.compile(sourceFile)
  const content = template(opts)

  await fs.writeFile(destFilePath, content, 'utf8')
  return fileRelativePath
}

module.exports.initGitRepo = async (opts) => {
  const {
    dest,
    template
  } = opts

  const gitIgnorePath = path.join(dest, '.gitignore')
  await fs.writeFile(gitIgnorePath, `
# See https://help.github.com/ignore-files/ for more about ignoring files.

# dependencies
node_modules

# builds
build
dist
.rpt2_cache

# misc
.DS_Store
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

npm-debug.log*
yarn-debug.log*
yarn-error.log*
`, 'utf8')

  const cmds = [
    ['git', 'init'],
    ['git', 'add', '.'],
    ['git', 'commit', '-m', `init ${pkg.name}@${pkg.version} ${template}`]
  ]

  return pEachSeries(cmds, async (cmd) => {
    await execa(cmd[0], cmd.slice(1), {
      cwd: dest
    })
  })
}
