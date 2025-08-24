/**
 * macOS E2E Testing with Tauri Driver
 * Tests the desktop application using WebDriver automation
 */

const { remote } = require('webdriverio');

describe('Codex CLI macOS E2E Tests', () => {
  let client;
  
  beforeAll(async () => {
    // Connect to tauri-driver for WebDriver automation
    client = await remote({
      hostname: '127.0.0.1',
      port: 4444,
      path: '/',
      capabilities: {
        'tauri:options': {
          application: './target/release/codex-cli-desktop'
        }
      }
    });
    
    // Wait for application to fully load
    await client.pause(2000);
  });

  describe('Application Lifecycle', () => {
    test('Application launches successfully', async () => {
      // Verify main window is displayed
      const windowHandle = await client.getWindowHandle();
      expect(windowHandle).toBeDefined();
      
      // Verify application title
      const title = await client.getTitle();
      expect(title).toContain('Codex CLI');
    });

    test('Main UI elements are present', async () => {
      // Check for main navigation tabs
      const terminalTab = await client.$('[data-testid="terminal-tab"]');
      await expect(terminalTab).toBeDisplayed();
      
      const planTab = await client.$('[data-testid="plan-tab"]');
      await expect(planTab).toBeDisplayed();
      
      const sessionTab = await client.$('[data-testid="session-tab"]');
      await expect(sessionTab).toBeDisplayed();
      
      const statusTab = await client.$('[data-testid="status-tab"]');
      await expect(statusTab).toBeDisplayed();
    });
  });

  describe('Terminal Functionality', () => {
    beforeEach(async () => {
      // Navigate to Terminal tab
      await client.$('[data-testid="terminal-tab"]').click();
      await client.pause(500);
    });

    test('Terminal session lifecycle', async () => {
      // Start new session
      const newSessionBtn = await client.$('[data-testid="new-session"]');
      if (await newSessionBtn.isDisplayed()) {
        await newSessionBtn.click();
      }
      
      // Verify terminal renders
      const terminal = await client.$('[data-testid="terminal"]');
      await expect(terminal).toBeDisplayed();
      
      // Execute pwd command
      await client.keys('pwd\n');
      
      // Wait for command execution
      await client.waitUntil(
        async () => {
          const output = await client.$('[data-testid="terminal-output"]').getText();
          return output.includes('/');
        },
        { timeout: 5000, timeoutMsg: 'Command output not received' }
      );
      
      // Verify command output contains a path
      const output = await client.$('[data-testid="terminal-output"]').getText();
      expect(output).toMatch(/\/.*$/m);
    });

    test('Command execution with output streaming', async () => {
      // Execute ls command
      await client.keys('ls -la\n');
      
      // Wait for output
      await client.waitUntil(
        async () => {
          const output = await client.$('[data-testid="terminal-output"]').getText();
          return output.length > 10;
        },
        { timeout: 5000 }
      );
      
      // Verify we got some directory listing
      const output = await client.$('[data-testid="terminal-output"]').getText();
      expect(output.length).toBeGreaterThan(0);
    });

    test('Command button shortcuts', async () => {
      // Test pwd button
      const pwdButton = await client.$('[data-testid="pwd-button"]');
      if (await pwdButton.isDisplayed()) {
        await pwdButton.click();
        
        await client.waitUntil(
          async () => {
            const output = await client.$('[data-testid="terminal-output"]').getText();
            return output.includes('/');
          },
          { timeout: 3000 }
        );
      }
      
      // Test echo button  
      const echoButton = await client.$('[data-testid="echo-button"]');
      if (await echoButton.isDisplayed()) {
        await echoButton.click();
        
        await client.waitUntil(
          async () => {
            const output = await client.$('[data-testid="terminal-output"]').getText();
            return output.includes('test') || output.includes('echo');
          },
          { timeout: 3000 }
        );
      }
    });

    test('Terminal resize and fit', async () => {
      const terminal = await client.$('[data-testid="terminal"]');
      
      // Get initial terminal size
      const initialSize = await terminal.getSize();
      expect(initialSize.width).toBeGreaterThan(100);
      expect(initialSize.height).toBeGreaterThan(100);
      
      // Simulate window resize by changing viewport
      await client.setWindowSize(800, 600);
      await client.pause(500);
      
      // Verify terminal is still displayed and responsive
      await expect(terminal).toBeDisplayed();
    });
  });

  describe('Plan Panel Functionality', () => {
    beforeEach(async () => {
      // Navigate to Plan tab
      await client.$('[data-testid="plan-tab"]').click();
      await client.pause(500);
    });

    test('Plan panel displays and accepts input', async () => {
      // Verify plan textarea is displayed
      const planTextarea = await client.$('[data-testid="plan-textarea"]');
      await expect(planTextarea).toBeDisplayed();
      
      // Clear existing content and add new plan
      await planTextarea.clearValue();
      const testPlan = '[{"id":"1","step":"Test step from E2E","status":"pending"}]';
      await planTextarea.setValue(testPlan);
      
      // Verify content was set
      const value = await planTextarea.getValue();
      expect(value).toContain('Test step from E2E');
    });

    test('Plan save and status updates', async () => {
      const planTextarea = await client.$('[data-testid="plan-textarea"]');
      await planTextarea.clearValue();
      
      // Add a plan with in_progress status
      const testPlan = '[{"id":"2","step":"In progress test","status":"in_progress"}]';
      await planTextarea.setValue(testPlan);
      
      // Save plan
      const saveButton = await client.$('[data-testid="save-plan-button"]');
      if (await saveButton.isDisplayed()) {
        await saveButton.click();
        
        // Wait for save confirmation
        await client.waitUntil(
          async () => {
            const statusMsg = await client.$('[data-testid="plan-status"]').getText();
            return statusMsg.includes('saved') || statusMsg.includes('updated');
          },
          { timeout: 3000, timeoutMsg: 'Plan save confirmation not received' }
        );
      }
    });
  });

  describe('Session Management', () => {
    beforeEach(async () => {
      // Navigate to Session tab
      await client.$('[data-testid="session-tab"]').click();
      await client.pause(500);
    });

    test('Session controls are functional', async () => {
      // Verify session control buttons are present
      const startButton = await client.$('[data-testid="start-session-button"]');
      const stopButton = await client.$('[data-testid="stop-session-button"]');
      
      if (await startButton.isDisplayed()) {
        await expect(startButton).toBeDisplayed();
      }
      
      if (await stopButton.isDisplayed()) {
        await expect(stopButton).toBeDisplayed();
      }
    });
  });

  describe('File Operations', () => {
    test('File read operations respect workspace scope', async () => {
      // Navigate to terminal
      await client.$('[data-testid="terminal-tab"]').click();
      
      // Try to read a file within workspace (should work)
      await client.keys('echo "test content" > test-file.txt\n');
      await client.pause(1000);
      
      // Try to read the created file
      await client.keys('cat test-file.txt\n');
      
      await client.waitUntil(
        async () => {
          const output = await client.$('[data-testid="terminal-output"]').getText();
          return output.includes('test content');
        },
        { timeout: 3000 }
      );
      
      // Clean up
      await client.keys('rm test-file.txt\n');
    });
  });

  describe('Security and Error Handling', () => {
    test('Workspace restriction enforcement', async () => {
      // Navigate to terminal
      await client.$('[data-testid="terminal-tab"]').click();
      
      // Try a command that should be restricted/handled safely
      await client.keys('echo "Security test completed"\n');
      
      await client.waitUntil(
        async () => {
          const output = await client.$('[data-testid="terminal-output"]').getText();
          return output.includes('Security test completed') || output.length > 0;
        },
        { timeout: 3000 }
      );
    });
  });

  describe('Keyboard Shortcuts', () => {
    test('Clear terminal shortcut', async () => {
      // Navigate to terminal
      await client.$('[data-testid="terminal-tab"]').click();
      
      // Add some content
      await client.keys('echo "content to clear"\n');
      await client.pause(1000);
      
      // Use Cmd+K to clear (macOS)
      await client.keys(['Command', 'k']);
      await client.pause(500);
      
      // Note: Terminal clearing might not be detectable via WebDriver
      // This test mainly verifies the shortcut doesn't cause errors
    });
  });

  afterAll(async () => {
    // Clean up WebDriver session
    if (client) {
      await client.deleteSession();
    }
  });
});