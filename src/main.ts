import { readFile, writeFile } from "node:fs/promises";
import { type WebDriver } from "selenium-webdriver";
import { setUpBrowser } from "./browser";
import { server } from "./server";

const pages = {
  fetch: await readFile(new URL("./fetch.html", import.meta.url), "utf-8"),
  xhr: await readFile(new URL("./xhr.html", import.meta.url), "utf-8"),
};

const timeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), ms).unref(),
    ),
  ]);
};

const { client, port, close } = await server(pages);
const base = `http://127.0.0.1:${port}`;

const wait = async () => {
  return await timeout(
    new Promise<Record<string, string>>((resolve) => {
      client.once("data", (headers) => resolve(headers));
    }),
    30_000,
  );
};

const browser = setUpBrowser({ platform: process.platform });

type Target = {
  key: string;
  optional?: boolean;
  driver: () => Promise<WebDriver>;
};

const prefix = (() => {
  if (process.platform === "win32") return "";
  if (process.platform === "darwin") return "macos-";
  if (process.platform === "linux") return "linux-";
  return "";
})();

const targets: Target[] = [];
for (const headless of [false, true]) {
  const name = headless ? "headless-" : "";
  targets.push({
    key: `${prefix}${name}chrome`,
    driver: () => browser.chromeDriver({ headless }),
  });
  targets.push({
    key: `${prefix}${name}edge`,
    driver: () => browser.edgeDriver({ headless }),
  });
  targets.push({
    key: `${prefix}${name}firefox`,
    driver: () => browser.firefoxDriver({ headless }),
  });
}
if (process.platform === "darwin") {
  targets.push({
    key: `${prefix}safari`,
    optional: true,
    driver: () => browser.safariDriver(),
  });
}

const collect = async (target: Target) => {
  const driver = await target.driver();
  try {
    const capabilities = await driver.getCapabilities();
    console.log(`  driver ready: ${target.key} (${capabilities.getBrowserVersion()})`);
    const [top] = await Promise.all([wait(), driver.get(`${base}`)]);
    const [fetched] = await Promise.all([wait(), driver.get(`${base}/fetch`)]);
    const [xhr] = await Promise.all([wait(), driver.get(`${base}/xhr`)]);
    return { top, fetched, xhr };
  } finally {
    await driver.quit().catch(() => {});
  }
};

const retries = 3;
const headers: [string, Record<string, string>][] = [];
for (const target of targets) {
  console.log(`running: ${target.key}`);
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { top, fetched, xhr } = await collect(target);
      headers.push(
        [target.key, top],
        [`${target.key}-fetch`, fetched],
        [`${target.key}-xhr`, xhr],
      );
      break;
    } catch (e) {
      client.removeAllListeners("data");
      console.warn(`  attempt ${attempt}/${retries} failed for ${target.key}: ${e}`);
      if (attempt === retries && !target.optional) throw e;
    }
  }
}

close();

await writeFile(
  "header.json",
  JSON.stringify(Object.fromEntries(headers), null, 4),
);
console.log(`collected: ${headers.length} keys`);
