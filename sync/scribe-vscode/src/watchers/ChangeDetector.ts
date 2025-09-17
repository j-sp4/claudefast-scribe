import * as vscode from 'vscode';
import { ConfigurationManager } from '../config/Configuration';
import { Logger } from '../utils/logger';
import { ChangeEvent } from './FileWatcher';

export interface SignificantChange {
    uri: vscode.Uri;
    type: 'create' | 'change' | 'delete';
    content?: string;
    language?: string;
    hasDocumentation: boolean;
    priority: 'high' | 'medium' | 'low';
}

export class ChangeDetector {
    constructor(private _config: ConfigurationManager) {}

    async analyzeChanges(groupedChanges: Map<string, ChangeEvent[]>): Promise<SignificantChange[]> {
        const significant: SignificantChange[] = [];
        
        for (const [uriString, events] of groupedChanges) {
            const uri = vscode.Uri.parse(uriString);
            const analysis = await this.analyzeFile(uri, events);
            
            if (analysis) {
                significant.push(analysis);
            }
        }
        
        // Sort by priority
        return significant.sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    }

    private async analyzeFile(uri: vscode.Uri, events: ChangeEvent[]): Promise<SignificantChange | null> {
        // Get the most recent event type
        const latestEvent = events[events.length - 1];
        
        // Handle delete events
        if (latestEvent.type === 'delete') {
            return {
                uri,
                type: 'delete',
                hasDocumentation: false,
                priority: 'low'
            };
        }
        
        try {
            // Read file content for create/change events
            const document = await vscode.workspace.openTextDocument(uri);
            const content = document.getText();
            const language = document.languageId;
            
            // Check if file has documentation
            const hasDocumentation = this.detectDocumentation(content, language, uri);
            
            // Determine priority based on file type and content
            const priority = this.calculatePriority(uri, content, language, hasDocumentation);
            
            // Skip trivial changes
            if (priority === 'low' && !hasDocumentation && latestEvent.type === 'change') {
                Logger.debug(`Skipping trivial change: ${uri.fsPath}`);
                return null;
            }
            
            return {
                uri,
                type: latestEvent.type,
                content,
                language,
                hasDocumentation,
                priority
            };
        } catch (error) {
            Logger.error(`Failed to analyze file: ${uri.fsPath}`, error);
            return null;
        }
    }

    private detectDocumentation(content: string, language: string, uri: vscode.Uri): boolean {
        const patterns: RegExp[] = [];
        
        // Language-specific documentation patterns
        switch (language) {
            case 'typescript':
            case 'javascript':
            case 'typescriptreact':
            case 'javascriptreact':
                patterns.push(
                    /\/\*\*[\s\S]*?\*\//g,  // JSDoc
                    /\/\/\/.+/g              // Triple-slash comments
                );
                break;
            
            case 'python':
                patterns.push(
                    /"""[\s\S]*?"""/g,       // Docstrings
                    /'''[\s\S]*?'''/g        // Alternative docstrings
                );
                break;
            
            case 'markdown':
                // Markdown files are documentation by nature
                return true;
            
            default:
                // Generic multi-line comment pattern
                patterns.push(/\/\*[\s\S]*?\*\//g);
        }
        
        // Check if any documentation pattern matches
        for (const pattern of patterns) {
            if (pattern.test(content)) {
                return true;
            }
        }
        
        // Check for README files
        const fileName = uri.fsPath.split('/').pop()?.toLowerCase();
        if (fileName?.startsWith('readme')) {
            return true;
        }
        
        return false;
    }

    private calculatePriority(
        uri: vscode.Uri, 
        content: string, 
        _language: string, 
        hasDocumentation: boolean
    ): 'high' | 'medium' | 'low' {
        const fileName = uri.fsPath.split('/').pop()?.toLowerCase() || '';
        
        // High priority files
        if (fileName.startsWith('readme') || 
            fileName === 'package.json' ||
            fileName === 'api.md' ||
            fileName === 'docs.md') {
            return 'high';
        }
        
        // Files with documentation are medium priority
        if (hasDocumentation) {
            return 'medium';
        }
        
        // API files are medium priority
        if (uri.fsPath.includes('/api/') || 
            uri.fsPath.includes('/routes/') ||
            uri.fsPath.includes('/controllers/')) {
            return 'medium';
        }
        
        // Test files are low priority
        if (uri.fsPath.includes('/test/') || 
            uri.fsPath.includes('.test.') ||
            uri.fsPath.includes('.spec.')) {
            return 'low';
        }
        
        // Large files (>10000 lines) are low priority
        const lineCount = content.split('\n').length;
        if (lineCount > 10000) {
            return 'low';
        }
        
        // Default to low priority
        return 'low';
    }
}