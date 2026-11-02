import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.resolve('docs/screenshots');

async function runAudit() {
  console.log('Starting Live Application Inspection...');
  
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const auditLog = {
    screens: [],
    consoleErrors: [],
    networkErrors: [],
  };

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      auditLog.consoleErrors.push({
        url: page.url(),
        text: msg.text(),
      });
      console.error('[Browser Console Error]', msg.text());
    }
  });

  page.on('response', (response) => {
    if (response.status() >= 400) {
      auditLog.networkErrors.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
      });
      console.warn(`[Network Error ${response.status()}] ${response.url()}`);
    }
  });

  async function inspectScreen(name, route, prepareFn) {
    console.log(`\n--- Inspecting: ${name} (${route}) ---`);
    if (route) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(e => console.log('Navigation warning:', e.message));
    }
    if (prepareFn) {
      await prepareFn(page);
      await page.waitForTimeout ? page.waitForTimeout(1000) : new Promise(r => setTimeout(r, 1000));
    }

    const screenData = {
      name,
      route: page.url(),
      title: await page.title(),
    };

    // Desktop Screenshot
    await page.setViewport({ width: 1440, height: 900 });
    const desktopFile = path.join(SCREENSHOT_DIR, `${name}_desktop.png`);
    await page.screenshot({ path: desktopFile, fullPage: true });
    screenData.desktopScreenshot = desktopFile;

    // Mobile Screenshot
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    const mobileFile = path.join(SCREENSHOT_DIR, `${name}_mobile.png`);
    await page.screenshot({ path: mobileFile, fullPage: true });
    screenData.mobileScreenshot = mobileFile;

    // Reset to Desktop for inspection
    await page.setViewport({ width: 1440, height: 900 });

    // Inspect Interactive elements
    const elements = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
        text: b.innerText.trim() || b.getAttribute('aria-label') || 'Button',
        disabled: b.disabled,
        classes: b.className,
      }));
      const links = Array.from(document.querySelectorAll('a')).map(a => ({
        text: a.innerText.trim(),
        href: a.getAttribute('href'),
      }));
      const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
        name: i.getAttribute('name') || i.getAttribute('id') || i.tagName,
        type: i.getAttribute('type') || i.tagName.toLowerCase(),
        placeholder: i.getAttribute('placeholder') || '',
      }));
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(h => h.innerText.trim());

      return { buttons, links, inputs, headings };
    });

    screenData.elements = elements;
    auditLog.screens.push(screenData);
    console.log(`Captured ${name}: Headings=${elements.headings.length}, Buttons=${elements.buttons.length}, Links=${elements.links.length}, Inputs=${elements.inputs.length}`);
  }

  // 1. Login Page
  await inspectScreen('01_login', '/login');

  // 2. Register Page
  await inspectScreen('02_register', '/register');

  // 3. Perform Login
  console.log('\nSubmitting login credentials...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
  await page.type('input[type="email"]', 'alex@enterprise-demo.io');
  await page.type('input[type="password"]', 'DemoPassword2026!');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 2000));

  // 4. Dashboard Overview
  await inspectScreen('03_dashboard', '/');

  // 5. Shared Inbox
  await inspectScreen('04_inbox', '/inbox');

  // 6. Contacts List
  await inspectScreen('05_contacts', '/contacts');

  // 7. Workflows / Automation
  await inspectScreen('06_workflows', '/workflows');

  // 8. Campaigns
  await inspectScreen('07_campaigns', '/campaigns');

  // 9. Audiences
  await inspectScreen('08_audiences', '/audiences');

  // 10. AI Studio
  await inspectScreen('09_ai_studio', '/ai-studio');

  // 11. Templates
  await inspectScreen('10_templates', '/templates');

  // 12. Analytics
  await inspectScreen('11_analytics', '/analytics');

  // 13. WhatsApp Connections
  await inspectScreen('12_connections', '/connections');

  // 14. Settings Workspace
  await inspectScreen('13_settings_workspace', '/settings/workspace');

  // 15. Settings Team
  await inspectScreen('14_settings_team', '/settings/team');

  // Save audit log JSON for report generation
  fs.writeFileSync('docs/audit_inspection_raw.json', JSON.stringify(auditLog, null, 2));
  console.log('\nAudit Inspection complete! Raw data saved to docs/audit_inspection_raw.json');

  await browser.close();
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
