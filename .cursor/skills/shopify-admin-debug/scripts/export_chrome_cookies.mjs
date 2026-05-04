#!/usr/bin/env node
/**
 * Export Chrome cookies for a target URL from a local Chrome profile.
 *
 * Default output is redacted. Use --format with --output when you need a file
 * that another local tool can consume.
 *
 * Examples:
 *   node scripts/export_chrome_cookies.mjs --list-profiles
 *   node scripts/export_chrome_cookies.mjs --url https://admin.shopify.com/store/quickstart-fe31b0ac/apps/ai-shopping-guide-dev/Settings --all-profiles
 *   node scripts/export_chrome_cookies.mjs --profile "Profile 7" --format playwright --output /tmp/shopify-admin-cookies.json
 *   node scripts/export_chrome_cookies.mjs --profile "Profile 7" --format header --output /tmp/shopify-admin-cookie-header.txt
 */
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import process from "node:process"
import crypto from "node:crypto"
import { execFile } from "node:child_process"
import { promisify } from "node:util"

const DEFAULT_URL = "https://admin.shopify.com/store/quickstart-fe31b0ac/apps/ai-shopping-guide-dev/Settings"
const CHROME_ROOT = path.join(os.homedir(), "Library/Application Support/Google/Chrome")
const WEBKIT_EPOCH_OFFSET_SECONDS = 11644473600
const MAX_UNIX_EXPIRES = 253402300799
const FORMATS = new Set(["summary", "json", "playwright", "header"])
const execFileAsync = promisify(execFile)

const argv = process.argv.slice(2)

const argValue = (name) => {
    const idx = argv.indexOf(name)
    if (idx === -1 || idx === argv.length - 1) {
        return undefined
    }
    return argv[idx + 1]
}

const hasFlag = (name) => argv.includes(name)

const targetUrl = argValue("--url") ?? DEFAULT_URL
const profileArg = argValue("--profile")
const outputPath = argValue("--output")
const format = argValue("--format") ?? "summary"
const listProfiles = hasFlag("--list-profiles")
const allProfiles = hasFlag("--all-profiles")
const showValues = hasFlag("--show-values")

const fail = (message) => {
    console.error(`Failed: ${message}`)
    process.exit(1)
}

const usage = () => {
    console.log(`Usage:
  node scripts/export_chrome_cookies.mjs [--url <url>] [--profile <profile>] [--format summary|json|playwright|header] [--output <file>]
  node scripts/export_chrome_cookies.mjs --all-profiles [--url <url>]
  node scripts/export_chrome_cookies.mjs --list-profiles

Options:
  --url            Target URL whose Chrome cookies should be read.
                   Default: ${DEFAULT_URL}
  --profile        Chrome profile directory name, for example "Default" or "Profile 7".
  --all-profiles   Read every detected Chrome profile and report matching counts.
  --format         summary, json, playwright, or header. Default: summary.
  --output         Write json/playwright/header output to this file instead of stdout.
  --show-values    Include cookie values in summary output. Avoid this in shared logs.
`)
}

const pathExists = async (filePath) => {
    try {
        await fs.access(filePath)
        return true
    } catch {
        return false
    }
}

const chromeTimeToUnixSeconds = (chromeTime) => {
    if (!Number.isFinite(chromeTime) || chromeTime <= 0) {
        return undefined
    }
    return Math.floor(chromeTime / 1_000_000 - WEBKIT_EPOCH_OFFSET_SECONDS)
}

const profileHasCookies = async (profileName) => {
    return pathExists(path.join(CHROME_ROOT, profileName, "Cookies"))
}

const getProfiles = async () => {
    const entries = await fs.readdir(CHROME_ROOT, { withFileTypes: true })
    const candidates = []
    for (const entry of entries) {
        if (!entry.isDirectory()) {
            continue
        }
        if (entry.name !== "Default" && !entry.name.startsWith("Profile ")) {
            continue
        }
        if (await profileHasCookies(entry.name)) {
            candidates.push(entry.name)
        }
    }
    return candidates.sort((a, b) => {
        if (a === "Default") {
            return -1
        }
        if (b === "Default") {
            return 1
        }
        return a.localeCompare(b, undefined, { numeric: true })
    })
}

const normalizeExpires = (value) => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return undefined
    }
    if (value === -1) {
        return -1
    }
    if (value <= 0) {
        return undefined
    }

    let unixSeconds = value
    if (value > 1e15) {
        unixSeconds = value / 1_000_000 - WEBKIT_EPOCH_OFFSET_SECONDS
    } else if (value > 1e12) {
        unixSeconds = value / 1000
    }

    unixSeconds = Math.floor(unixSeconds)
    if (unixSeconds <= 0 || unixSeconds > MAX_UNIX_EXPIRES) {
        return undefined
    }
    return unixSeconds
}

const getDomainCandidates = (urlString) => {
    const { hostname } = new URL(urlString)
    const parts = hostname.split(".")
    const candidates = new Set([hostname, `.${hostname}`])

    for (let index = 1; index < parts.length - 1; index += 1) {
        const domain = parts.slice(index).join(".")
        candidates.add(domain)
        candidates.add(`.${domain}`)
    }

    return Array.from(candidates)
}

const pathMatchesUrl = (cookiePath, urlString) => {
    const pathname = new URL(urlString).pathname || "/"
    const normalizedCookiePath = cookiePath || "/"
    if (normalizedCookiePath === "/") {
        return true
    }
    if (pathname === normalizedCookiePath) {
        return true
    }
    return pathname.startsWith(normalizedCookiePath.endsWith("/") ? normalizedCookiePath : `${normalizedCookiePath}/`)
}

const normalizeSameSite = (sameSite) => {
    if (["Strict", "Lax", "None"].includes(sameSite)) {
        return sameSite
    }
    return undefined
}

const toPlaywrightCookie = (cookie) => {
    const mapped = {
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path || "/"
    }

    const expires = normalizeExpires(cookie.expires)
    if (typeof expires === "number") {
        mapped.expires = expires
    }
    if (typeof cookie.httpOnly === "boolean") {
        mapped.httpOnly = cookie.httpOnly
    }
    if (typeof cookie.secure === "boolean") {
        mapped.secure = cookie.secure
    }

    const sameSite = normalizeSameSite(cookie.sameSite)
    if (sameSite) {
        mapped.sameSite = sameSite
    }

    return mapped
}

const sameSiteName = (value) => {
    if (value === 0) {
        return "None"
    }
    if (value === 1) {
        return "Lax"
    }
    if (value === 2) {
        return "Strict"
    }
    return undefined
}

const redact = (value) => {
    if (!value) {
        return ""
    }
    if (value.length <= 8) {
        return `${"*".repeat(value.length)} (${value.length} chars)`
    }
    return `${value.slice(0, 4)}...${value.slice(-4)} (${value.length} chars)`
}

let chromeCookieKey

const getChromeCookieKey = async () => {
    if (chromeCookieKey) {
        return chromeCookieKey
    }
    try {
        const { stdout } = await execFileAsync("security", ["find-generic-password", "-w", "-s", "Chrome Safe Storage"], {
            encoding: "utf8"
        })
        chromeCookieKey = crypto.pbkdf2Sync(stdout.trim(), "saltysalt", 1003, 16, "sha1")
        return chromeCookieKey
    } catch (error) {
        fail(`Could not read "Chrome Safe Storage" from Keychain: ${String(error?.message ?? error)}`)
    }
}

const decryptChromeValue = async (encryptedHex, hostKey) => {
    if (!encryptedHex) {
        return ""
    }

    const encryptedValue = Buffer.from(encryptedHex, "hex")
    if (encryptedValue.length === 0) {
        return ""
    }

    if (encryptedValue.subarray(0, 3).toString("utf8") !== "v10") {
        return encryptedValue.toString("utf8")
    }

    const key = await getChromeCookieKey()
    const decipher = crypto.createDecipheriv("aes-128-cbc", key, Buffer.alloc(16, " "))
    decipher.setAutoPadding(true)
    const decrypted = Buffer.concat([decipher.update(encryptedValue.subarray(3)), decipher.final()])

    const hostHash = crypto.createHash("sha256").update(hostKey).digest()
    if (decrypted.length >= hostHash.length && decrypted.subarray(0, hostHash.length).equals(hostHash)) {
        return decrypted.subarray(hostHash.length).toString("utf8")
    }
    return decrypted.toString("utf8")
}

const readRowsFromSqlite = async (dbPath, hostKeys) => {
    const quotedHostKeys = hostKeys.map((hostKey) => `'${hostKey.replaceAll("'", "''")}'`).join(",")
    const sql = `
select
  host_key,
  name,
  value,
  hex(encrypted_value) as encrypted_value_hex,
  path,
  expires_utc,
  is_secure,
  is_httponly,
  samesite
from cookies
where host_key in (${quotedHostKeys})
order by host_key, path, name;
`
    const { stdout } = await execFileAsync("sqlite3", ["-json", dbPath, sql], {
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024
    })
    const trimmed = stdout.trim()
    return trimmed ? JSON.parse(trimmed) : []
}

const loadChromeCookies = async (profile) => {
    const sourceDb = path.join(CHROME_ROOT, profile, "Cookies")
    if (!(await pathExists(sourceDb))) {
        return []
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "chrome-cookies-"))
    const tempDb = path.join(tempDir, "Cookies")
    try {
        await fs.copyFile(sourceDb, tempDb)
        const rows = await readRowsFromSqlite(tempDb, getDomainCandidates(targetUrl))
        const cookies = []
        for (const row of rows) {
            if (!pathMatchesUrl(row.path, targetUrl)) {
                continue
            }
            const value = row.value || (await decryptChromeValue(row.encrypted_value_hex, row.host_key))
            cookies.push({
                name: row.name,
                value,
                domain: row.host_key,
                path: row.path || "/",
                expires: chromeTimeToUnixSeconds(Number(row.expires_utc)),
                httpOnly: Boolean(row.is_httponly),
                secure: Boolean(row.is_secure),
                sameSite: sameSiteName(Number(row.samesite))
            })
        }
        return cookies
    } finally {
        await fs.rm(tempDir, { recursive: true, force: true })
    }
}

const writeOutput = async (content) => {
    if (!outputPath) {
        console.log(content)
        return
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true })
    await fs.writeFile(outputPath, content, { encoding: "utf8", mode: 0o600 })
    await fs.chmod(outputPath, 0o600)
    console.log(`Wrote ${format} cookies to ${outputPath}`)
}

const formatCookies = (cookies) => {
    if (format === "summary") {
        return cookies
            .map((cookie) => {
                const value = showValues ? cookie.value : redact(cookie.value)
                const flags = [
                    cookie.secure ? "Secure" : undefined,
                    cookie.httpOnly ? "HttpOnly" : undefined,
                    cookie.sameSite ? `SameSite=${cookie.sameSite}` : undefined
                ].filter(Boolean)
                return `${cookie.name}=${value}; domain=${cookie.domain}; path=${cookie.path || "/"}${flags.length ? `; ${flags.join("; ")}` : ""}`
            })
            .join("\n")
    }

    if (format === "json") {
        return `${JSON.stringify(cookies, null, 2)}\n`
    }

    if (format === "playwright") {
        return `${JSON.stringify(cookies.map(toPlaywrightCookie), null, 2)}\n`
    }

    if (format === "header") {
        return `${cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ")}\n`
    }

    fail(`Unsupported --format "${format}". Use one of: ${Array.from(FORMATS).join(", ")}`)
}

const printProfileList = async () => {
    const profiles = await getProfiles()
    if (profiles.length === 0) {
        fail(`No Chrome profiles with cookie databases found under ${CHROME_ROOT}`)
    }
    console.log(profiles.join("\n"))
}

const collectProfileCookies = async (profile) => {
    const cookies = await loadChromeCookies(profile)
    return { profile, cookies: Array.isArray(cookies) ? cookies : [] }
}

const run = async () => {
    if (hasFlag("--help")) {
        usage()
        return
    }
    if (!FORMATS.has(format)) {
        fail(`Unsupported --format "${format}". Use one of: ${Array.from(FORMATS).join(", ")}`)
    }
    if (listProfiles) {
        await printProfileList()
        return
    }

    const profiles = allProfiles ? await getProfiles() : [profileArg ?? "Default"]
    const results = []
    for (const profile of profiles) {
        results.push(await collectProfileCookies(profile))
    }

    const matchingResults = results.filter((result) => result.cookies.length > 0)
    if (allProfiles) {
        for (const result of results) {
            console.log(`${result.profile}: ${result.cookies.length} cookies`)
        }
        if (matchingResults.length === 0) {
        fail(`No Chrome cookies found for ${targetUrl}`)
        }
        return
    }

    if (matchingResults.length === 0) {
        fail(`No Chrome cookies found for ${targetUrl} in profile "${profiles[0]}". Try --all-profiles or --list-profiles.`)
    }

    const [{ profile, cookies }] = matchingResults
    if (format === "summary") {
        console.log(`URL: ${targetUrl}`)
        console.log(`Chrome profile: ${profile}`)
        console.log(`Cookies: ${cookies.length}`)
    }
    await writeOutput(formatCookies(cookies))
}

run().catch((error) => {
    fail(String(error?.stack ?? error?.message ?? error))
})
