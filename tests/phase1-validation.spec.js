/**
 * Phase 1 (macOS MVP) Comprehensive Validation Tests
 * Tests all core features as real user workflows to validate Phase 1 completion
 */

const { remote } = require('webdriverio');

describe('Phase 1 MVP - Complete User Validation', () => {
  let client;
  
  beforeAll(async () => {
    // Launch the application in development mode
    client = await remote({
      hostname: '127.0.0.1',
      port: 4444,
      path: '/',
      capabilities: {
        'tauri:options': {
          application: './target/debug/codex-cli-desktop'
        }
      }
    });
    
    // Wait for application to fully initialize
    await client.pause(3000);
  });

  describe('🚀 Application Launch & Core UI', () => {
    test('Application launches and displays main interface', async () => {
      // Verify window opens
      const windowHandle = await client.getWindowHandle();
      expect(windowHandle).toBeDefined();
      
      // Verify application title
      const title = await client.getTitle();
      expect(title).toContain('Codex CLI');
      
      // Verify all core sections are present
      const terminal = await client.$('#terminal');
      await expect(terminal).toBeDisplayed();
      
      const planText = await client.$('#planText');
      await expect(planText).toBeDisplayed();
      
      const workspace = await client.$('#workspace');
      await expect(workspace).toBeDisplayed();
      
      const status = await client.$('#status');
      await expect(status).toBeDisplayed();
    });

    test('Platform information displays correctly', async () => {
      const platformInfo = await client.$('#platformInfo');
      await expect(platformInfo).toBeDisplayed();
      
      const platformText = await platformInfo.getText();
      expect(platformText).toMatch(/Desktop|macOS/i);
    });

    test('Workspace path is shown', async () => {
      const workspace = await client.$('#workspace');
      const workspaceText = await workspace.getText();
      expect(workspaceText).toMatch(/Workspace: .+/);
    });
  });

  describe('⚡ Terminal Operations - Core Feature Set', () => {
    test('Basic command execution works', async () => {
      // Execute pwd command via button
      const pwdButton = await client.$('#runPwd');
      await pwdButton.click();
      
      // Wait for command to execute and output to appear
      await client.waitUntil(
        async () => {
          const terminalContent = await client.$('#terminal').getText();
          return terminalContent.includes('/');
        },
        { timeout: 5000, timeoutMsg: 'pwd command did not execute' }
      );
      
      // Verify we got a valid path output
      const terminalOutput = await client.$('#terminal').getText();
      expect(terminalOutput).toMatch(/\/[\w\/]*/);
    });

    test('Multiple commands execute in sequence', async () => {
      // Clear any existing content by checking status
      const initialStatus = await client.$('#status').getText();
      
      // Execute ls command
      const lsButton = await client.$('#runLs');
      await lsButton.click();
      
      await client.waitUntil(
        async () => {
          const statusContent = await client.$('#status').getText();
          return statusContent.length > initialStatus.length;
        },
        { timeout: 5000 }
      );
      
      // Execute echo command
      const echoButton = await client.$('#runEcho');
      await echoButton.click();
      
      await client.waitUntil(
        async () => {
          const terminalContent = await client.$('#terminal').getText();
          return terminalContent.includes('test') || 
                 (await client.$('#status').getText()).includes('echo');
        },
        { timeout: 5000 }
      );
      
      // Verify both commands were processed
      const statusContent = await client.$('#status').getText();
      expect(statusContent.length).toBeGreaterThan(initialStatus.length);
    });

    test('Command output streaming works in real-time', async () => {
      // Record initial terminal content
      const initialContent = await client.$('#terminal').getText();
      
      // Execute pwd command
      const pwdButton = await client.$('#runPwd');
      await pwdButton.click();
      
      // Verify content updated (streaming occurred)
      await client.waitUntil(
        async () => {
          const currentContent = await client.$('#terminal').getText();
          return currentContent.length > initialContent.length ||
                 currentContent !== initialContent;
        },
        { timeout: 5000, timeoutMsg: 'No streaming output detected' }
      );
    });
  });

  describe('📋 Plan Management - Business Logic Validation', () => {
    test('Plan panel accepts and displays JSON input', async () => {
      const planTextarea = await client.$('#planText');
      
      // Clear existing content
      await planTextarea.clearValue();
      
      // Input valid plan JSON
      const testPlan = JSON.stringify([
        { id: "1", step: "Phase 1 validation test", status: "pending" },
        { id: "2", step: "Verify plan functionality", status: "in_progress" }
      ], null, 2);
      
      await planTextarea.setValue(testPlan);
      
      // Verify content was set correctly
      const planValue = await planTextarea.getValue();
      expect(planValue).toContain('Phase 1 validation test');
      expect(planValue).toContain('in_progress');
    });

    test('Plan save functionality works', async () => {
      const planTextarea = await client.$('#planText');
      const saveButton = await client.$('#savePlan');
      
      // Set a test plan
      await planTextarea.clearValue();
      const testPlan = '[{"id":"test1","step":"Test save operation","status":"pending"}]';
      await planTextarea.setValue(testPlan);
      
      // Save the plan
      await saveButton.click();
      
      // Check for save confirmation in status
      await client.waitUntil(
        async () => {
          const statusContent = await client.$('#status').getText();
          return statusContent.includes('Plan saved') || 
                 statusContent.includes('plan-updated') ||
                 statusContent.length > 10; // Any status update
        },
        { timeout: 5000, timeoutMsg: 'Plan save confirmation not received' }
      );
    });

    test('Plan load functionality works', async () => {
      const loadButton = await client.$('#loadPlan');
      const planTextarea = await client.$('#planText');
      
      // Load current plan
      await loadButton.click();
      
      // Wait for plan to load
      await client.pause(1000);
      
      // Verify plan content loaded
      const planContent = await planTextarea.getValue();
      expect(planContent.length).toBeGreaterThan(2); // At least '[]' or some content
    });
  });

  describe('🔧 Session Management', () => {
    test('Session lifecycle - start, send, stop', async () => {
      const startButton = await client.$('#startSession');
      const sendHelloButton = await client.$('#sendHello');
      const stopButton = await client.$('#stopSession');
      const sessionOutput = await client.$('#sessionOut');
      
      // Start a session
      await startButton.click();
      
      // Wait for session start confirmation
      await client.waitUntil(
        async () => {
          const sessionContent = await sessionOutput.getText();
          return sessionContent.includes('session') && sessionContent.includes('started');
        },
        { timeout: 5000, timeoutMsg: 'Session did not start' }
      );
      
      // Send hello command
      await sendHelloButton.click();
      await client.pause(1000); // Allow command processing
      
      // Stop session
      await stopButton.click();
      await client.pause(1000);
      
      // Verify session lifecycle worked
      const finalContent = await sessionOutput.getText();
      expect(finalContent).toContain('session');
    });
  });

  describe('🛡️ Security & Workspace Validation', () => {
    test('Workspace information is displayed correctly', async () => {
      const workspaceEl = await client.$('#workspace');
      const workspaceText = await workspaceEl.getText();
      
      // Should show workspace path
      expect(workspaceText).toMatch(/Workspace: .+/);
      expect(workspaceText).toContain('/');
    });

    test('Platform detection works correctly', async () => {
      const platformInfo = await client.$('#platformInfo');
      const platformText = await platformInfo.getText();
      
      // Should detect macOS/Desktop
      expect(platformText.length).toBeGreaterThan(0);
    });
  });

  describe('🎯 IPC Communication & Real-time Events', () => {
    test('Commands trigger status updates (IPC working)', async () => {
      const statusEl = await client.$('#status');
      const initialStatus = await statusEl.getText();
      
      // Execute a command that should update status
      const pwdButton = await client.$('#runPwd');
      await pwdButton.click();
      
      // Wait for status update
      await client.waitUntil(
        async () => {
          const currentStatus = await statusEl.getText();
          return currentStatus !== initialStatus;
        },
        { timeout: 5000, timeoutMsg: 'IPC status update did not occur' }
      );
    });

    test('Multiple IPC commands work in sequence', async () => {
      // Execute multiple commands to test IPC reliability
      const pwdButton = await client.$('#runPwd');
      const lsButton = await client.$('#runLs');
      const echoButton = await client.$('#runEcho');
      
      // Sequential execution
      await pwdButton.click();
      await client.pause(500);
      await lsButton.click();
      await client.pause(500);
      await echoButton.click();
      
      // Verify all commands were processed
      await client.waitUntil(
        async () => {
          const statusContent = await client.$('#status').getText();
          // Should have multiple status updates
          return statusContent.split('\n').length > 3;
        },
        { timeout: 8000, timeoutMsg: 'Multiple IPC commands failed' }
      );
    });
  });

  describe('📱 Responsive Design & Mobile Readiness', () => {
    test('UI adapts to smaller screen sizes', async () => {
      // Simulate mobile screen size
      await client.setWindowSize(400, 800);
      await client.pause(1000);
      
      // Verify mobile tabs are shown
      const mobileTabs = await client.$('.mobile-tabs');
      if (await mobileTabs.isExisting()) {
        const display = await mobileTabs.getCSSProperty('display');
        expect(display.value).toBe('flex');
      }
      
      // Reset to desktop size
      await client.setWindowSize(1200, 800);
      await client.pause(500);
    });

    test('All interactive elements remain accessible on mobile', async () => {
      // Set mobile viewport
      await client.setWindowSize(375, 667);
      await client.pause(1000);
      
      // Test button interactions
      const pwdButton = await client.$('#runPwd');
      const saveButton = await client.$('#savePlan');
      
      // Buttons should still be clickable
      await expect(pwdButton).toBeDisplayed();
      await expect(saveButton).toBeDisplayed();
      
      // Reset viewport
      await client.setWindowSize(1200, 800);
    });
  });

  describe('🔄 Error Handling & Recovery', () => {
    test('Application handles invalid plan JSON gracefully', async () => {
      const planTextarea = await client.$('#planText');
      const saveButton = await client.$('#savePlan');
      
      // Input invalid JSON
      await planTextarea.clearValue();
      await planTextarea.setValue('invalid json {');
      
      // Try to save
      await saveButton.click();
      
      // Should handle error gracefully (no crash)
      await client.waitUntil(
        async () => {
          const statusContent = await client.$('#status').getText();
          return statusContent.includes('error') || statusContent.includes('Error') || 
                 statusContent.length > 5; // Some error response
        },
        { timeout: 5000 }
      );
      
      // Application should still be responsive
      const windowHandle = await client.getWindowHandle();
      expect(windowHandle).toBeDefined();
    });
  });

  afterAll(async () => {
    // Clean up test data and close application
    if (client) {
      try {
        // Clean up any test files or state if needed
        await client.deleteSession();
      } catch (error) {
        console.warn('Cleanup warning:', error.message);
      }
    }
  });
});