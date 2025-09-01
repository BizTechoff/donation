const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
}

// Define all routes to capture
const routes = [
    { name: 'home', path: '/', title: 'דף הבית' },
    { name: 'donor-details', path: '/donor-details', title: 'פרטי תורם' },
    { name: 'donor-list', path: '/donor-list', title: 'רשימת תורמים' },
    { name: 'donations-list', path: '/donations-list', title: 'רשימת תרומות' },
    { name: 'campaigns', path: '/campaigns', title: 'קמפיינים' },
    { name: 'standing-orders', path: '/standing-orders', title: 'הוראות קבע' },
    { name: 'certificates', path: '/certificates', title: 'תעודות' },
    { name: 'reminders', path: '/reminders', title: 'תזכורות' },
    { name: 'donors-map', path: '/donors-map', title: 'מפת תורמים' },
    { name: 'reports', path: '/reports', title: 'דוחות' },
    { name: 'user-accounts', path: '/user-accounts', title: 'ניהול משתמשים' }
];

async function captureScreenshots() {
    console.log('Starting screenshot capture...');
    
    // Launch browser
    const browser = await puppeteer.launch({
        headless: false, // Set to true if you don't want to see the browser
        defaultViewport: {
            width: 1920,
            height: 1080
        },
        args: ['--start-maximized']
    });

    const page = await browser.newPage();
    
    // Set viewport to full HD
    await page.setViewport({ width: 1920, height: 1080 });
    
    try {
        // First navigate to login page
        console.log('Navigating to application...');
        await page.goto('http://localhost:4200', { 
            waitUntil: 'networkidle0',
            timeout: 30000 
        });
        
        // Wait for the app to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if we need to login
        const signInButton = await page.$('button');
        if (signInButton) {
            const buttonText = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const signInBtn = buttons.find(btn => 
                    btn.textContent.includes('Sign In') || 
                    btn.textContent.includes('כניסה')
                );
                return signInBtn ? signInBtn.textContent : null;
            });
            
            if (buttonText) {
                console.log('Login required. Please login manually in the browser window...');
                console.log('Press Enter when logged in...');
                await new Promise(resolve => process.stdin.once('data', resolve));
            }
        }
        
        // Capture each route
        for (const route of routes) {
            console.log(`Capturing ${route.title} (${route.path})...`);
            
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
                fullPage: false // Set to true if you want the entire scrollable page
            });
            
            console.log(`✓ Saved ${route.name}.png`);
        }
        
        // Also capture with sidebar open
        console.log('Capturing home page with sidebar...');
        await page.goto('http://localhost:4200', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        
        // Click menu button to open sidebar
        const menuButton = await page.$('button mat-icon');
        if (menuButton) {
            await page.evaluate(() => {
                const icons = Array.from(document.querySelectorAll('mat-icon'));
                const menuIcon = icons.find(icon => icon.textContent === 'menu');
                if (menuIcon) {
                    const button = menuIcon.closest('button');
                    if (button) button.click();
                }
            });
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        await page.screenshot({
            path: path.join(screenshotsDir, 'home-with-sidebar.png'),
            fullPage: false
        });
        
        console.log('✓ Saved home-with-sidebar.png');
        
    } catch (error) {
        console.error('Error capturing screenshots:', error);
    } finally {
        await browser.close();
    }
    
    console.log('\nAll screenshots captured successfully!');
    console.log(`Screenshots saved in: ${screenshotsDir}`);
}

// Run the capture
captureScreenshots().catch(console.error);