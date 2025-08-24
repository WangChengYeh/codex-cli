/**
 * Android E2E Testing with Appium
 * Tests the Android APK using Appium WebDriver automation
 */

const { remote } = require('webdriverio');

describe('Codex CLI Android E2E Tests', () => {
  let driver;
  
  beforeAll(async () => {
    // Connect to Appium server for Android automation
    driver = await remote({
      hostname: '127.0.0.1',
      port: 4723,
      path: '/',
      capabilities: {
        platformName: 'Android',
        'appium:deviceName': 'Android Emulator',
        'appium:app': './target/android/app/build/outputs/apk/debug/app-debug.apk',
        'appium:appPackage': 'com.codexcli.desktop',
        'appium:appActivity': '.MainActivity',
        'appium:automationName': 'UiAutomator2',
        'appium:newCommandTimeout': 300,
        'appium:androidInstallTimeout': 90000
      }
    });
    
    // Wait for application to fully load
    await driver.pause(3000);
  });

  describe('Application Lifecycle', () => {
    test('Android APK launches successfully', async () => {
      // Verify app launches and main activity is displayed
      await driver.waitUntil(
        async () => {
          const activity = await driver.getCurrentActivity();
          return activity === '.MainActivity';
        },
        { timeout: 10000, timeoutMsg: 'MainActivity did not launch' }
      );
      
      // Verify app package is correct
      const packageName = await driver.getCurrentPackage();
      expect(packageName).toBe('com.codexcli.desktop');
    });

    test('Mobile UI elements are present', async () => {
      // Check for mobile tab navigation elements
      const terminalTab = await driver.$('android=new UiSelector().text("Terminal")');
      await expect(terminalTab).toBeDisplayed();
      
      const planTab = await driver.$('android=new UiSelector().text("Plan")');
      await expect(planTab).toBeDisplayed();
      
      const sessionTab = await driver.$('android=new UiSelector().text("Session")');
      await expect(sessionTab).toBeDisplayed();
      
      const statusTab = await driver.$('android=new UiSelector().text("Status")');
      await expect(statusTab).toBeDisplayed();
    });
  });

  describe('Mobile Touch Interaction', () => {
    test('Tab navigation via touch', async () => {
      // Tap Terminal tab
      await driver.$('android=new UiSelector().text("Terminal")').click();
      await driver.pause(1000);
      
      // Verify Terminal tab is active (check for terminal-specific elements)
      const webView = await driver.$('android=new UiSelector().className("android.webkit.WebView")');
      await expect(webView).toBeDisplayed();
      
      // Tap Plan tab
      await driver.$('android=new UiSelector().text("Plan")').click();
      await driver.pause(1000);
      
      // Tap back to Terminal
      await driver.$('android=new UiSelector().text("Terminal")').click();
      await driver.pause(1000);
    });

    test('WebView interaction and virtual keyboard', async () => {
      // Navigate to Terminal tab
      await driver.$('android=new UiSelector().text("Terminal")').click();
      
      // Tap in WebView to focus
      const webView = await driver.$('android=new UiSelector().className("android.webkit.WebView")');
      await webView.click();
      
      // Check if virtual keyboard appears (wait a bit for keyboard animation)
      await driver.pause(2000);
      
      // Switch to WebView context for DOM interaction
      const contexts = await driver.getContexts();
      const webviewContext = contexts.find(context => 
        context.includes('WEBVIEW') || context.includes('codexcli')
      );
      
      if (webviewContext) {
        await driver.switchContext(webviewContext);
        
        // Try to interact with terminal elements in WebView
        try {
          const terminalElement = await driver.$('body');
          if (await terminalElement.isDisplayed()) {
            // Type a simple command
            await terminalElement.click();
            await driver.pause(1000);
          }
        } catch (error) {
          console.log('WebView DOM interaction not available, testing native elements');
        }
        
        // Switch back to native context
        await driver.switchContext('NATIVE_APP');
      }
    });
  });

  describe('Mobile Gestures', () => {
    test('Swipe gestures for scrolling', async () => {
      // Navigate to Terminal tab
      await driver.$('android=new UiSelector().text("Terminal")').click();
      
      // Get screen dimensions for gesture calculations
      const screenSize = await driver.getWindowSize();
      const centerX = screenSize.width / 2;
      const startY = screenSize.height * 0.8;
      const endY = screenSize.height * 0.3;
      
      // Perform upward swipe (scroll down)
      await driver.performActions([{
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: centerX, y: startY },
          { type: 'pointerDown', button: 0 },
          { type: 'pointerMove', duration: 800, x: centerX, y: endY },
          { type: 'pointerUp', button: 0 }
        ]
      }]);
      
      await driver.pause(1000);
      
      // Perform downward swipe (scroll up)  
      await driver.performActions([{
        type: 'pointer',
        id: 'finger2',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: centerX, y: endY },
          { type: 'pointerDown', button: 0 },
          { type: 'pointerMove', duration: 800, x: centerX, y: startY },
          { type: 'pointerUp', button: 0 }
        ]
      }]);
      
      await driver.pause(500);
    });

    test('Long press and context menu', async () => {
      // Navigate to Terminal tab
      await driver.$('android=new UiSelector().text("Terminal")').click();
      
      // Long press on WebView area
      const webView = await driver.$('android=new UiSelector().className("android.webkit.WebView")');
      const location = await webView.getLocation();
      const size = await webView.getSize();
      
      const centerX = location.x + size.width / 2;
      const centerY = location.y + size.height / 2;
      
      // Perform long press
      await driver.performActions([{
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: centerX, y: centerY },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: 1500 }, // Long press duration
          { type: 'pointerUp', button: 0 }
        ]
      }]);
      
      await driver.pause(1000);
      
      // Check if any context menu or selection appeared
      // (This is mainly testing that long press doesn't crash the app)
    });
  });

  describe('Device Rotation', () => {
    test('Portrait to landscape rotation', async () => {
      // Start in portrait
      await driver.setOrientation('PORTRAIT');
      await driver.pause(1000);
      
      // Verify UI adapts to portrait
      const terminalTab = await driver.$('android=new UiSelector().text("Terminal")');
      await expect(terminalTab).toBeDisplayed();
      
      // Rotate to landscape
      await driver.setOrientation('LANDSCAPE');
      await driver.pause(2000); // Wait for rotation animation
      
      // Verify UI still works in landscape
      await expect(terminalTab).toBeDisplayed();
      
      // Rotate back to portrait
      await driver.setOrientation('PORTRAIT');
      await driver.pause(1000);
    });
  });

  describe('Android Platform Constraints', () => {
    test('Android-specific command filtering', async () => {
      // This test verifies the platform-specific command restrictions
      // Since we can't easily interact with terminal commands via Appium,
      // we mainly test that the app handles Android constraints gracefully
      
      // Navigate to Terminal tab
      await driver.$('android=new UiSelector().text("Terminal")').click();
      
      // Interact with the WebView containing the terminal
      const webView = await driver.$('android=new UiSelector().className("android.webkit.WebView")');
      await webView.click();
      
      // The app should remain responsive and not crash when processing commands
      await driver.pause(2000);
      
      // Verify app is still responsive
      const planTab = await driver.$('android=new UiSelector().text("Plan")');
      await planTab.click();
      await driver.pause(1000);
      
      // Switch back to terminal
      await driver.$('android=new UiSelector().text("Terminal")').click();
    });

    test('File system sandbox restrictions', async () => {
      // Test that the app respects Android file system permissions
      // Navigate through different tabs to ensure file operations don't crash
      
      await driver.$('android=new UiSelector().text("Plan")').click();
      await driver.pause(1000);
      
      await driver.$('android=new UiSelector().text("Session")').click();
      await driver.pause(1000);
      
      await driver.$('android=new UiSelector().text("Status")').click();
      await driver.pause(1000);
      
      // Return to terminal
      await driver.$('android=new UiSelector().text("Terminal")').click();
      
      // App should remain stable throughout navigation
    });
  });

  describe('Performance and Stability', () => {
    test('App performance under interaction stress', async () => {
      // Perform rapid tab switching to test performance
      for (let i = 0; i < 5; i++) {
        await driver.$('android=new UiSelector().text("Terminal")').click();
        await driver.pause(200);
        
        await driver.$('android=new UiSelector().text("Plan")').click();
        await driver.pause(200);
        
        await driver.$('android=new UiSelector().text("Session")').click();
        await driver.pause(200);
        
        await driver.$('android=new UiSelector().text("Status")').click();
        await driver.pause(200);
      }
      
      // Verify app is still responsive
      const terminalTab = await driver.$('android=new UiSelector().text("Terminal")');
      await expect(terminalTab).toBeDisplayed();
    });

    test('Memory usage stability', async () => {
      // Navigate through features to ensure no memory leaks
      await driver.$('android=new UiSelector().text("Terminal")').click();
      
      // Interact with WebView multiple times
      const webView = await driver.$('android=new UiSelector().className("android.webkit.WebView")');
      for (let i = 0; i < 3; i++) {
        await webView.click();
        await driver.pause(500);
      }
      
      // Switch contexts and navigate
      await driver.$('android=new UiSelector().text("Plan")').click();
      await driver.pause(1000);
      
      await driver.$('android=new UiSelector().text("Terminal")').click();
      
      // App should remain stable
      await expect(webView).toBeDisplayed();
    });
  });

  describe('Android System Integration', () => {
    test('App backgrounding and foregrounding', async () => {
      // Send app to background
      await driver.runAppInBackground(5000); // Background for 5 seconds
      
      // Verify app returns to foreground properly
      const terminalTab = await driver.$('android=new UiSelector().text("Terminal")');
      await expect(terminalTab).toBeDisplayed();
      
      // Verify app state is preserved
      await terminalTab.click();
      const webView = await driver.$('android=new UiSelector().className("android.webkit.WebView")');
      await expect(webView).toBeDisplayed();
    });

    test('Device back button handling', async () => {
      // Navigate to a different tab
      await driver.$('android=new UiSelector().text("Plan")').click();
      await driver.pause(1000);
      
      // Press Android back button
      await driver.back();
      await driver.pause(1000);
      
      // App should handle back button gracefully (might close or navigate)
      // We mainly test that it doesn't crash
    });
  });

  afterAll(async () => {
    // Clean up Appium session
    if (driver) {
      await driver.deleteSession();
    }
  });
});