#!/usr/bin/env node
/**
 * Launch Playwright with exported Chrome cookies and inspect a Shopify admin page.
 *
 * Usage:
 *   node scripts/inspect_shopify_admin_with_cookies.mjs \
 *     --url "https://admin.shopify.com/store/quickstart-fe31b0ac/apps/ai-shopping-guide-dev/Settings" \
 *     --cookies /tmp/shopify-admin-cookies.json \
 *     --output-dir /tmp/shopify-admin-debug
 *
 * Run from a repo that has Playwright installed, such as shopping_assistant_by_shopily.
 */
import fs from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { createRequire } from "node:module"

const argv = process.argv.slice(2)

const argValue = (name) => {
    const idx = argv.indexOf(name)
    if (idx === -1 || idx === argv.length - 1) {
        return undefined
    }
    return argv[idx + 1]
}

const hasFlag = (name) => argv.includes(name)

const targetUrl =
    argValue("--url") ?? "https://admin.shopify.com/store/quickstart-fe31b0ac/apps/ai-shopping-guide-dev/Settings"
const cookiesPath = argValue("--cookies") ?? "/tmp/shopify-admin-cookies.json"
const outputDir = argValue("--output-dir") ?? "/tmp/shopify-admin-debug"
const headed = hasFlag("--headed") || !hasFlag("--headless")
const timeoutMs = Number(argValue("--timeout-ms") ?? "45000")

const fail = (message) => {
    console.error(`Failed: ${message}`)
    process.exit(1)
}

const safeName = (value) => value.replace(/[^a-zA-Z0-9_.-]+/g, "_").slice(0, 140)

const loadPlaywright = async () => {
    const requireFromCwd = createRequire(path.join(process.cwd(), "package.json"))
    try {
        return requireFromCwd("playwright")
    } catch {
        try {
            const mod = requireFromCwd("@playwright/test")
            return { chromium: mod.chromium }
        } catch {
            fail("Playwright is not available. Run this from shopping_assistant_by_shopily after npm install.")
        }
    }
}

const normalizeCookies = (cookies) =>
    cookies.map((cookie) => {
        const normalized = {
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path || "/",
            httpOnly: Boolean(cookie.httpOnly),
            secure: Boolean(cookie.secure)
        }
        if (typeof cookie.expires === "number") {
            normalized.expires = cookie.expires
        }
        if (["Strict", "Lax", "None"].includes(cookie.sameSite)) {
            normalized.sameSite = cookie.sameSite
        }
        return normalized
    })

const run = async () => {
    await fs.mkdir(outputDir, { recursive: true })

    const rawCookies = JSON.parse(await fs.readFile(cookiesPath, "utf8"))
    if (!Array.isArray(rawCookies) || rawCookies.length === 0) {
        fail(`Cookie file is empty or invalid: ${cookiesPath}`)
    }

    const { chromium } = await loadPlaywright()
    const browser = await chromium.launch({
        channel: "chrome",
        headless: !headed
    }).catch(async () =>
        chromium.launch({
            headless: !headed
        })
    )

    const context = await browser.newContext()
    await context.addCookies(normalizeCookies(rawCookies))

    const page = await context.newPage()
    const consoleLogs = []
    const requests = []
    const responses = []

    page.on("console", (msg) => {
        consoleLogs.push({
            type: msg.type(),
            text: msg.text(),
            location: msg.location()
        })
    })

    page.on("request", (request) => {
        const url = request.url()
        if (url.includes("shopify") || url.includes("shopily") || url.includes("shoply")) {
            requests.push({
                method: request.method(),
                url,
                resourceType: request.resourceType(),
                headers: Object.fromEntries(
                    Object.entries(request.headers()).filter(([key]) => key.toLowerCase() !== "cookie")
                )
            })
        }
    })

    page.on("response", (response) => {
        const url = response.url()
        if (url.includes("shopify") || url.includes("shopily") || url.includes("shoply")) {
            responses.push({
                status: response.status(),
                url,
                headers: Object.fromEntries(
                    Object.entries(response.headers()).filter(([key]) => key.toLowerCase() !== "set-cookie")
                )
            })
        }
    })

    const navError = await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs })
        .then(() => null)
        .catch((error) => String(error?.message ?? error))

    await page.waitForLoadState("networkidle", { timeout: timeoutMs }).catch(() => undefined)

    const title = await page.title().catch(() => "")
    const url = page.url()
    const screenshotPath = path.join(outputDir, `${safeName("shopify-admin")}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined)

    const artifact = {
        targetUrl,
        finalUrl: url,
        title,
        navError,
        cookiesImported: rawCookies.length,
        consoleLogs,
        requests,
        responses,
        screenshotPath
    }

    const artifactPath = path.join(outputDir, "playwright-shopify-admin-debug.json")
    await fs.writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8")

    console.log(JSON.stringify({
        targetUrl,
        finalUrl: url,
        title,
        navError,
        cookiesImported: rawCookies.length,
        consoleLogCount: consoleLogs.length,
        requestCount: requests.length,
        responseCount: responses.length,
        artifactPath,
        screenshotPath
    }, null, 2))

    await browser.close()
}

run().catch((error) => fail(String(error?.stack ?? error?.message ?? error)))
