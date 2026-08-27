import puppeteer from 'puppeteer';
import path from 'path';

const outDir = '/home/xihad/.gemini/antigravity-cli/brain/d21ef77d-176b-459e-b81a-15aa1e990bcb/screenshots';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();

  // 1. Screenshot Login Page
  console.log('Navigating to Login...');
  await page.goto('http://localhost:3005/login', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(outDir, '01_login.png'), fullPage: true });

  // 2. Perform Login
  console.log('Logging in as admin...');
  await page.waitForSelector('input[type="password"]');
  await page.type('input[type="text"]', 'admin');
  await page.type('input[type="password"]', 'Admin123456!');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await delay(2000);

  // 3. Screenshot Dashboard
  console.log('Capturing Dashboard...');
  await page.goto('http://localhost:3005/', { waitUntil: 'networkidle2' });
  await delay(1500);
  await page.screenshot({ path: path.join(outDir, '02_dashboard.png'), fullPage: true });

  // 4. Screenshot Orders List
  console.log('Capturing Orders...');
  await page.goto('http://localhost:3005/orders', { waitUntil: 'networkidle2' });
  await delay(1000);
  await page.screenshot({ path: path.join(outDir, '03_orders.png'), fullPage: true });

  // 5. Screenshot New Order Form
  console.log('Capturing New Order Form...');
  await page.goto('http://localhost:3005/orders/new', { waitUntil: 'networkidle2' });
  await delay(1000);
  await page.screenshot({ path: path.join(outDir, '04_new_order.png'), fullPage: true });

  // 6. Screenshot Invoices
  console.log('Capturing Invoices...');
  await page.goto('http://localhost:3005/invoices', { waitUntil: 'networkidle2' });
  await delay(1000);
  await page.screenshot({ path: path.join(outDir, '05_invoices.png'), fullPage: true });

  // 7. Screenshot Accounts
  console.log('Capturing Accounts...');
  await page.goto('http://localhost:3005/accounts', { waitUntil: 'networkidle2' });
  await delay(1000);
  await page.screenshot({ path: path.join(outDir, '06_accounts.png'), fullPage: true });

  // 8. Screenshot Buyers
  console.log('Capturing Buyers...');
  await page.goto('http://localhost:3005/buyers', { waitUntil: 'networkidle2' });
  await delay(1000);
  await page.screenshot({ path: path.join(outDir, '07_buyers.png'), fullPage: true });

  // 9. Screenshot Employees
  console.log('Capturing Employees...');
  await page.goto('http://localhost:3005/employees', { waitUntil: 'networkidle2' });
  await delay(1000);
  await page.screenshot({ path: path.join(outDir, '08_employees.png'), fullPage: true });

  // 10. Screenshot Reports
  console.log('Capturing Reports...');
  await page.goto('http://localhost:3005/reports', { waitUntil: 'networkidle2' });
  await delay(1000);
  await page.screenshot({ path: path.join(outDir, '09_reports.png'), fullPage: true });

  // 11. Screenshot Settings
  console.log('Capturing Settings...');
  await page.goto('http://localhost:3005/settings', { waitUntil: 'networkidle2' });
  await delay(1000);
  await page.screenshot({ path: path.join(outDir, '10_settings.png'), fullPage: true });

  // 12. Screenshot Users
  console.log('Capturing Users...');
  await page.goto('http://localhost:3005/users', { waitUntil: 'networkidle2' });
  await delay(1000);
  await page.screenshot({ path: path.join(outDir, '11_users.png'), fullPage: true });

  // 13. Screenshot Archive
  console.log('Capturing Archive...');
  await page.goto('http://localhost:3005/archive', { waitUntil: 'networkidle2' });
  await delay(1000);
  await page.screenshot({ path: path.join(outDir, '12_archive.png'), fullPage: true });

  console.log('All screenshots captured successfully!');
  await browser.close();
}

run().catch(console.error);
