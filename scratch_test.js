import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capture console messages
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.error('PAGE ERROR:', error.message));

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 10000 });
    
    // Wait a bit for React to render
    await page.waitForTimeout(2000);
    
    // Get the HTML body to see what's rendered
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    console.log('HTML CONTENT:');
    console.log(bodyHTML);
    
  } catch (err) {
    console.error("Navigation error:", err);
  } finally {
    await browser.close();
  }
})();
