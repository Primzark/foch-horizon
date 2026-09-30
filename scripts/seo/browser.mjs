import { chromium as playwrightChromium } from 'playwright';

export async function launchBrowser() {
  if (process.platform === 'linux' && process.env.VERCEL) {
    // Vercel's build image has no apt-get; bundle Chromium and its Linux libraries.
    const { default: chromium } = await import('@sparticuz/chromium');
    chromium.setGraphicsMode = false;
    return playwrightChromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  return playwrightChromium.launch({ headless: true });
}
