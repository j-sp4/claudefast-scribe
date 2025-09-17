import * as assert from 'assert';
import * as vscode from 'vscode';
import { ChangeDetector } from '../../watchers/ChangeDetector';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', () => {
        const extension = vscode.extensions.getExtension('scribe-mcp.scribe-vscode');
        assert.ok(extension);
    });

    test('Extension should activate', async () => {
        const extension = vscode.extensions.getExtension('scribe-mcp.scribe-vscode');
        if (extension) {
            await extension.activate();
            assert.ok(extension.isActive);
        }
    });

    test('Commands should be registered', async () => {
        const commands = await vscode.commands.getCommands(true);
        
        assert.ok(commands.includes('scribe.enable'));
        assert.ok(commands.includes('scribe.disable'));
        assert.ok(commands.includes('scribe.showStatus'));
        assert.ok(commands.includes('scribe.openSettings'));
        assert.ok(commands.includes('scribe.syncNow'));
    });

    suite('ChangeDetector Tests', () => {
        test('Should detect JavaScript documentation', () => {
            const _content = `
                /**
                 * This is a JSDoc comment
                 * @param {string} name - The name
                 */
                function greet(name) {
                    console.log('Hello ' + name);
                }
            `;
            
            // Mock config manager
            const mockConfig = {
                isEnabled: () => true,
                getWatchPatterns: () => ['**/*.js'],
                getIgnorePatterns: () => ['**/node_modules/**'],
                getSyncDelay: () => 5000
            } as any;
            
            const _detector = new ChangeDetector(mockConfig);
            // Test would need access to private method, so we'd need to refactor
            // or use a different testing approach
        });

        test('Should detect TypeScript documentation', () => {
            const _content = `
                /**
                 * Interface for user data
                 */
                interface User {
                    name: string;
                    age: number;
                }
                
                /// <reference types="node" />
            `;
            
            // Similar test structure as above
        });

        test('Should detect Python docstrings', () => {
            const _content = `
                """
                This is a module docstring
                """
                
                def hello(name):
                    '''
                    Say hello to someone
                    '''
                    print(f"Hello {name}")
            `;
            
            // Similar test structure
        });
    });

    suite('Configuration Tests', () => {
        test('Should load default configuration', () => {
            const config = vscode.workspace.getConfiguration('scribe');
            
            assert.strictEqual(typeof config.get('enabled'), 'boolean');
            assert.strictEqual(typeof config.get('serverUrl'), 'string');
            assert.ok(Array.isArray(config.get('watchPatterns')));
            assert.ok(Array.isArray(config.get('ignorePatterns')));
            assert.strictEqual(typeof config.get('syncDelay'), 'number');
        });

        test('Should have valid default patterns', () => {
            const config = vscode.workspace.getConfiguration('scribe');
            const watchPatterns = config.get<string[]>('watchPatterns', []);
            const ignorePatterns = config.get<string[]>('ignorePatterns', []);
            
            assert.ok(watchPatterns.length > 0);
            assert.ok(ignorePatterns.includes('**/node_modules/**'));
            assert.ok(ignorePatterns.includes('**/.git/**'));
        });
    });
});