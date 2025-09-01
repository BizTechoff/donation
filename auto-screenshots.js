const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Create screenshots directory
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
}

async function autoScreenshots() {
    console.log('🚀 Auto Screenshot Capture Starting...');
    console.log('📋 This will capture all pages automatically');
    console.log('⏱️  Please make sure you are logged in at http://localhost:4200');
    console.log('');
    
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1920, height: 1080 },
        args: ['--start-maximized']
    });

    const page = await browser.newPage();
    
    try {
        // Wait 5 seconds for user to be ready
        console.log('⏱️  Starting in 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('📱 Opening application...');
        await page.goto('http://localhost:4200', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        // Wait for app to load
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('📸 [1/12] Taking home page screenshot...');
        await page.screenshot({
            path: path.join(screenshotsDir, '01-home.png'),
            fullPage: false
        });

        // Try to open sidebar
        console.log('📸 [2/12] Opening sidebar and taking screenshot...');
        try {
            // Try different selectors for the menu button
            const selectors = [
                'button.sidenav-toggle',
                'button:has(mat-icon)',
                '.mat-toolbar button:first-child',
                'mat-toolbar button'
            ];
            
            let clicked = false;
            for (const selector of selectors) {
                try {
                    await page.click(selector);
                    clicked = true;
                    break;
                } catch (e) {
                    // Continue to next selector
                }
            }
            
            if (!clicked) {
                // Try JavaScript click
                await page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const menuBtn = buttons.find(btn => {
                        const icon = btn.querySelector('mat-icon');
                        return icon && (icon.textContent === 'menu' || icon.textContent === 'Menu');
                    });
                    if (menuBtn) menuBtn.click();
                });
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (e) {
            console.log('   ⚠️  Could not open sidebar, continuing...');
        }
        
        await page.screenshot({
            path: path.join(screenshotsDir, '00-home-with-sidebar.png'),
            fullPage: false
        });

        // Navigate to each page
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
                    waitUntil: 'networkidle2',
                    timeout: 20000
                });
                
                // Wait for page to render
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                await page.screenshot({
                    path: path.join(screenshotsDir, `${pageInfo.name}.png`),
                    fullPage: false
                });
                
                successCount++;
                console.log(`   ✅ Success!`);
                
            } catch (error) {
                console.log(`   ❌ Failed: ${error.message}`);
                // Continue with next page
            }
        }

        console.log(`\n🎉 COMPLETED SUCCESSFULLY!`);
        console.log(`📊 Successfully captured ${successCount}/12 screenshots`);
        console.log(`📁 Screenshots saved to: ${screenshotsDir}`);
        console.log(`🌐 Open screenshots-gallery.html in your browser to view all images`);

    } catch (error) {
        console.error('❌ Main Error:', error.message);
    }

    console.log('\n⏱️  Browser will close in 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await browser.close();
    console.log('✅ Done!');
}

autoScreenshots().catch(console.error);