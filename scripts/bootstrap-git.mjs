// Downloads portable MinGit into .tools/git (no admin, no system changes).
// Run with: <runtime-node> scripts/bootstrap-git.mjs
import { mkdir, stat } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

const OUT_DIR = '.tools'
const ZIP = `${OUT_DIR}/mingit.zip`

// Pinned fallback used when the GitHub API is rate-limited.
const FALLBACK_TAG = 'v2.56.0.windows.4'
const FALLBACK_URL = `https://github.com/git-for-windows/git/releases/download/${FALLBACK_TAG}/MinGit-2.56.0.4-64-bit.zip`

const log = (...a) => console.log('[bootstrap-git]', ...a)

async function resolveUrl() {
  try {
    const res = await fetch('https://api.github.com/repos/git-for-windows/git/releases/latest', {
      headers: { 'User-Agent': 'chillout-bootstrap', Accept: 'application/vnd.github+json' },
    })
    if (!res.ok) {
      log(`GitHub API ${res.status} — using pinned fallback`)
      return FALLBACK_URL
    }
    const release = await res.json()
    const asset = (release.assets ?? []).find((a) => /^MinGit-.*-64-bit\.zip$/i.test(a.name ?? ''))
    if (!asset) {
      log(`no MinGit asset in ${release.tag_name} — using pinned fallback`)
      return FALLBACK_URL
    }
    log('release', release.tag_name, '->', asset.name)
    return asset.browser_download_url
  } catch (err) {
    log('API lookup failed:', err?.message ?? err, '— using pinned fallback')
    return FALLBACK_URL
  }
}

const url = await resolveUrl()
log('url', url)

await mkdir(OUT_DIR, { recursive: true })

const dl = await fetch(url)
if (!dl.ok) {
  log(`FAILED: download responded ${dl.status}`)
  process.exit(1)
}

await pipeline(Readable.fromWeb(dl.body), createWriteStream(ZIP))

const { size } = await stat(ZIP)
log(`downloaded ${(size / 1024 / 1024).toFixed(1)} MB -> ${ZIP}`)
