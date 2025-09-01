const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
}

// Define all routes to capture (updated to match actual Angular routes)
const routes = [
    { name: '01-home', path: '/', title: 'דף הבית' },
    { name: '02-donor-details', path: '/donor-details', title: 'פרטי תורם' },
    { name: '03-donor-list', path: '/donor-list', title: 'רשימת תורמים' },
    { name: '04-donations-list', path: '/donations-list', title: 'רשימת תרומות' },
    { name: '05-campaigns', path: '/campaigns', title: 'קמפיינים' },
    { name: '06-standing-orders', path: '/standing-orders', title: 'הוראות קבע' },
    { name: '07-certificates', path: '/certificates', title: 'תעודות הוקרה' },
    { name: '08-reminders', path: '/reminders', title: 'תזכורות' },
    { name: '09-donors-map', path: '/donors-map', title: 'מפת תורמים' },
    { name: '10-reports', path: '/reports', title: 'דוחות' },
    { name: '11-user-accounts', path: '/user-accounts', title: 'ניהול משתמשים' }
];

async function captureScreenshots() {
    console.log('Starting screenshot capture...');
    console.log('IMPORTANT: The browser will open. Please login if needed.');
    console.log('='.repeat(60));
    
    // Launch browser
    const browser = await puppeteer.launch({
        headless: false, // Show browser so user can login
        defaultViewport: null,
        args: ['--start-maximized']
    });

    const page = await browser.newPage();
    
    // Set viewport to full HD
    await page.setViewport({ width: 1920, height: 1080 });
    
    try {
        // Navigate to application
        console.log('\nNavigating to application...');
        await page.goto('http://localhost:4200', { 
            waitUntil: 'networkidle0',
            timeout: 60000 
        });
        
        console.log('\n' + '='.repeat(60));
        console.log('INSTRUCTIONS:');
        console.log('1. If you see a login screen, please login now');
        console.log('2. Wait for the application to fully load');
        console.log('3. Press ENTER here when ready to start capturing screenshots');
        console.log('='.repeat(60) + '\n');
        
        // Wait for user to press Enter
        await new Promise(resolve => {
            process.stdin.once('data', () => {
                console.log('Starting capture process...\n');
                resolve();
            });
        });
        
        // Capture each route
        for (const route of routes) {
            console.log(`[${routes.indexOf(route) + 1}/${routes.length}] Capturing ${route.title}...`);
            
            try {
                // Navigate to the route
                await page.goto(`http://localhost:4200${route.path}`, {
                    waitUntil: 'networkidle0',
                    timeout: 30000
                });
                
                // Wait for content to load
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Take screenshot
                const screenshotPath = path.join(screenshotsDir, `${route.name}.png`);
                await page.screenshot({
                    path: screenshotPath,
                    fullPage: false
                });
                
                console.log(`    ✓ Saved ${route.name}.png`);
            } catch (err) {
                console.log(`    ✗ Failed to capture ${route.title}: ${err.message}`);
            }
        }
        
        // Capture home with sidebar
        console.log('\n[Special] Capturing home page with sidebar open...');
        await page.goto('http://localhost:4200', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        
        // Wait and click menu button
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Try to open sidebar
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const menuButton = buttons.find(btn => {
                const icon = btn.querySelector('mat-icon');
                return icon && icon.textContent === 'menu';
            });
            if (menuButton) menuButton.click();
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await page.screenshot({
            path: path.join(screenshotsDir, '00-home-with-sidebar.png'),
            fullPage: false
        });
        
        console.log('    ✓ Saved 00-home-with-sidebar.png');
        
    } catch (error) {
        console.error('\nError during capture:', error.message);
    } finally {
        console.log('\n' + '='.repeat(60));
        console.log('Screenshot capture completed!');
        console.log(`All screenshots saved in: ${screenshotsDir}`);
        console.log('Press ENTER to close the browser...');
        
        await new Promise(resolve => {
            process.stdin.once('data', resolve);
        });
        
        await browser.close();
    }
}

// Run the capture
captureScreenshots().catch(console.error);