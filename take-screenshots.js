const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Create screenshots directory
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
}

async function takeScreenshots() {
    console.log('🚀 Starting screenshot capture...');
    
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    try {
        console.log('📱 Opening application...');
        await page.goto('http://localhost:4200', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        console.log('\n⚠️  MANUAL STEPS REQUIRED:');
        console.log('1. Login to the application if needed');
        console.log('2. Wait for the app to fully load');
        console.log('3. Press ANY KEY to continue...\n');

        // Wait for user input
        process.stdin.setRawMode(true);
        await new Promise(resolve => process.stdin.once('data', resolve));
        process.stdin.setRawMode(false);

        console.log('✅ Starting automated capture...\n');

        // 1. Home page
        console.log('📸 [1/12] Home page...');
        await page.screenshot({
            path: path.join(screenshotsDir, '01-home.png'),
            fullPage: false
        });

        // 2. Open sidebar and take screenshot
        console.log('📸 [2/12] Home with sidebar...');
        await page.click('button[aria-label="Toggle navigation"], .sidenav-toggle, button:has(mat-icon:text("menu"))').catch(() => {
            console.log('   ⚠️  Could not find menu button, trying alternative...');
        });
        
        // Wait a bit for sidebar to open
        await page.waitForTimeout(500);
        await page.screenshot({
            path: path.join(screenshotsDir, '00-home-with-sidebar.png'),
            fullPage: false
        });

        // 3-12. Navigate to each page via URL
        const pages = [
            { name: '02-donor-details', url: '/donor-details', title: 'Donor Details' },
            { name: '03-donor-list', url: '/donor-list', title: 'Donor List' },
            { name: '04-donations-list', url: '/donations-list', title: 'Donations List' },
            { name: '05-campaigns', url: '/campaigns', title: 'Campaigns' },
            { name: '06-standing-orders', url: '/standing-orders', title: 'Standing Orders' },
            { name: '07-certificates', url: '/certificates', title: 'Certificates' },
            { name: '08-reminders', url: '/reminders', title: 'Reminders' },
            { name: '09-donors-map', url: '/donors-map', title: 'Donors Map' },
            { name: '10-reports', url: '/reports', title: 'Reports' },
            { name: '11-user-accounts', url: '/user-accounts', title: 'User Accounts' }
        ];

        let successCount = 2; // We already took 2 screenshots
        
        for (let i = 0; i < pages.length; i++) {
            const pageInfo = pages[i];
            console.log(`📸 [${i + 3}/12] ${pageInfo.title}...`);
            
            try {
                await page.goto(`http://localhost:4200${pageInfo.url}`, {
                    waitUntil: 'networkidle0',
                    timeout: 15000
                });
                
                await page.waitForTimeout(1000);
                
                await page.screenshot({
                    path: path.join(screenshotsDir, `${pageInfo.name}.png`),
                    fullPage: false
                });
                
                successCount++;
                console.log(`   ✅ Success!`);
                
            } catch (error) {
                console.log(`   ❌ Failed: ${error.message}`);
            }
        }

        console.log(`\n🎉 Completed! Successfully captured ${successCount} screenshots`);
        console.log(`📁 Screenshots saved to: ${screenshotsDir}`);
        console.log(`🌐 Open screenshots-gallery.html to view all images`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    console.log('\n⏳ Press ANY KEY to close browser...');
    process.stdin.setRawMode(true);
    await new Promise(resolve => process.stdin.once('data', resolve));
    process.stdin.setRawMode(false);
    
    await browser.close();
}

takeScreenshots().catch(console.error);