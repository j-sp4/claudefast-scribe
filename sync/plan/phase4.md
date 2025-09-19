# Phase 4: Intelligence & Documentation Extraction

**Duration**: Week 4 (5 days)
**Goal**: Add AI-powered documentation extraction and intelligent change detection

## Objectives

1. Extract documentation from code automatically
2. Generate proposals with AI assistance
3. Implement smart change detection
4. Optimize performance for large codebases
5. Add documentation coverage analytics

## Technical Specifications

### Intelligence Architecture
```
┌──────────────────────────────────────────────┐
│           Document Analyzer                  │
├──────────────────────────────────────────────┤
│  Code Parser → AST Analysis → Doc Extraction │
│       ↓            ↓              ↓          │
│  JSDoc/TSDoc   Functions    Markdown Files   │
│       ↓            ↓              ↓          │
│  ┌──────────────────────────────────────┐   │
│  │     AI Documentation Generator        │   │
│  │  (Local LLM or Claude API)           │   │
│  └──────────────────────────────────────┘   │
│                    ↓                         │
│           Proposal Generation                │
└──────────────────────────────────────────────┘
```

### Key Components

#### 1. Documentation Extractor
```typescript
// src/intelligence/DocExtractor.ts
import * as ts from 'typescript';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';

export class DocExtractor {
    private cache = new Map<string, ExtractedDoc>();
    
    async extractFromFile(uri: vscode.Uri): Promise<ExtractedDoc> {
        const cached = this.cache.get(uri.toString());
        if (cached && !this.isStale(cached)) {
            return cached;
        }
        
        const document = await vscode.workspace.openTextDocument(uri);
        const language = document.languageId;
        const content = document.getText();
        
        let extracted: ExtractedDoc;
        switch (language) {
            case 'typescript':
            case 'typescriptreact':
                extracted = await this.extractTypeScript(content, uri);
                break;
            case 'javascript':
            case 'javascriptreact':
                extracted = await this.extractJavaScript(content, uri);
                break;
            case 'python':
                extracted = await this.extractPython(content, uri);
                break;
            case 'markdown':
                extracted = await this.extractMarkdown(content, uri);
                break;
            default:
                extracted = await this.extractGeneric(content, uri);
        }
        
        this.cache.set(uri.toString(), extracted);
        return extracted;
    }
    
    private async extractTypeScript(content: string, uri: vscode.Uri): Promise<ExtractedDoc> {
        const sourceFile = ts.createSourceFile(
            uri.fsPath,
            content,
            ts.ScriptTarget.Latest,
            true
        );
        
        const docs: DocumentationItem[] = [];
        
        const visit = (node: ts.Node) => {
            // Extract JSDoc comments
            const jsdoc = this.getJSDocComment(node, sourceFile);
            if (jsdoc) {
                docs.push({
                    type: 'jsdoc',
                    content: jsdoc,
                    location: this.getNodeLocation(node, sourceFile),
                    symbol: this.getSymbolName(node)
                });
            }
            
            // Extract function signatures
            if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
                docs.push({
                    type: 'function',
                    content: this.getFunctionSignature(node),
                    location: this.getNodeLocation(node, sourceFile),
                    symbol: node.name?.getText(sourceFile) || 'anonymous'
                });
            }
            
            // Extract class documentation
            if (ts.isClassDeclaration(node)) {
                docs.push({
                    type: 'class',
                    content: this.getClassInfo(node, sourceFile),
                    location: this.getNodeLocation(node, sourceFile),
                    symbol: node.name?.getText(sourceFile) || 'anonymous'
                });
            }
            
            // Extract interface definitions
            if (ts.isInterfaceDeclaration(node)) {
                docs.push({
                    type: 'interface',
                    content: this.getInterfaceInfo(node, sourceFile),
                    location: this.getNodeLocation(node, sourceFile),
                    symbol: node.name.getText(sourceFile)
                });
            }
            
            ts.forEachChild(node, visit);
        };
        
        visit(sourceFile);
        
        return {
            uri,
            language: 'typescript',
            items: docs,
            extractedAt: new Date()
        };
    }
    
    private getJSDocComment(node: ts.Node, sourceFile: ts.SourceFile): string | null {
        const jsDocNodes = (node as any).jsDoc;
        if (!jsDocNodes || jsDocNodes.length === 0) return null;
        
        return jsDocNodes
            .map((doc: ts.JSDoc) => doc.comment)
            .filter(Boolean)
            .join('\n');
    }
}
```

#### 2. AI Documentation Generator
```typescript
// src/intelligence/AIDocGenerator.ts
export class AIDocGenerator {
    private client: AnthropicClient | OpenAIClient;
    
    constructor(private config: Configuration) {
        this.client = this.initializeClient();
    }
    
    async generateDocumentation(
        code: string,
        context: CodeContext
    ): Promise<GeneratedDoc> {
        const prompt = this.buildPrompt(code, context);
        
        try {
            const response = await this.client.complete({
                prompt,
                maxTokens: 500,
                temperature: 0.3
            });
            
            return this.parseResponse(response);
        } catch (error) {
            // Fallback to local heuristics
            return this.generateLocal(code, context);
        }
    }
    
    private buildPrompt(code: string, context: CodeContext): string {
        return `Generate concise documentation for the following ${context.language} code.
        
Context:
- File: ${context.filePath}
- Purpose: ${context.purpose || 'Unknown'}
- Dependencies: ${context.dependencies?.join(', ') || 'None'}

Code:
\`\`\`${context.language}
${code}
\`\`\`

Generate:
1. Brief description (1-2 sentences)
2. Parameters/Arguments (if applicable)
3. Return value (if applicable)
4. Usage example
5. Important notes or warnings

Format as markdown suitable for documentation.`;
    }
    
    async improveDocumentation(
        existing: string,
        code: string
    ): Promise<string> {
        const prompt = `Improve the following documentation based on the code:

Existing documentation:
${existing}

Code:
${code}

Provide improved documentation that is:
- More accurate
- More comprehensive
- Better structured
- Includes examples if missing`;

        const response = await this.client.complete({
            prompt,
            maxTokens: 500,
            temperature: 0.3
        });
        
        return response;
    }
}
```

#### 3. Smart Change Detector
```typescript
// src/intelligence/ChangeDetector.ts
export class SmartChangeDetector {
    private documentationPatterns = [
        /\/\*\*[\s\S]*?\*\//g,  // JSDoc
        /^#{1,6}\s+.+$/gm,       // Markdown headers
        /```[\s\S]*?```/g,       // Code blocks
        /^\s*\/\/\/.+$/gm,       // Triple-slash comments
        /"""[\s\S]*?"""/g,       // Python docstrings
    ];
    
    async analyzeChange(
        oldContent: string,
        newContent: string,
        uri: vscode.Uri
    ): Promise<ChangeAnalysis> {
        const diff = this.computeDiff(oldContent, newContent);
        
        // Check if documentation changed
        const docChanged = this.hasDocumentationChange(diff);
        
        // Check if API changed
        const apiChanged = await this.hasAPIChange(diff, uri);
        
        // Check if it's a significant change
        const significance = this.calculateSignificance(diff);
        
        // Determine sync priority
        const priority = this.calculatePriority({
            docChanged,
            apiChanged,
            significance,
            fileImportance: this.getFileImportance(uri)
        });
        
        return {
            uri,
            type: this.determineChangeType(diff),
            hasDocumentation: docChanged,
            hasAPIChange: apiChanged,
            significance,
            priority,
            suggestions: await this.generateSuggestions(diff, uri)
        };
    }
    
    private hasDocumentationChange(diff: Diff): boolean {
        for (const pattern of this.documentationPatterns) {
            const oldMatches = diff.oldContent.match(pattern) || [];
            const newMatches = diff.newContent.match(pattern) || [];
            
            if (oldMatches.length !== newMatches.length) return true;
            if (oldMatches.some((m, i) => m !== newMatches[i])) return true;
        }
        
        return false;
    }
    
    private async hasAPIChange(diff: Diff, uri: vscode.Uri): Promise<boolean> {
        const language = this.getLanguage(uri);
        
        if (language === 'typescript' || language === 'javascript') {
            return this.detectJSAPIChange(diff);
        } else if (language === 'python') {
            return this.detectPythonAPIChange(diff);
        }
        
        return false;
    }
    
    private calculateSignificance(diff: Diff): number {
        const factors = [
            this.getAdditionScore(diff),
            this.getDeletionScore(diff),
            this.getComplexityScore(diff),
            this.getDocumentationScore(diff)
        ];
        
        return factors.reduce((a, b) => a + b, 0) / factors.length;
    }
}
```

#### 4. Proposal Generator
```typescript
// src/intelligence/ProposalGenerator.ts
export class ProposalGenerator {
    constructor(
        private extractor: DocExtractor,
        private aiGenerator: AIDocGenerator,
        private changeDetector: SmartChangeDetector
    ) {}
    
    async generateProposal(
        change: ChangeAnalysis
    ): Promise<Proposal | null> {
        // Don't generate for trivial changes
        if (change.significance < 0.3) return null;
        
        const doc = await this.extractor.extractFromFile(change.uri);
        
        // Generate or improve documentation
        let proposedDoc: string;
        if (doc.items.length === 0) {
            // No existing documentation, generate new
            proposedDoc = await this.aiGenerator.generateDocumentation(
                change.newContent,
                {
                    language: change.language,
                    filePath: change.uri.fsPath,
                    purpose: await this.inferPurpose(change.uri)
                }
            );
        } else {
            // Improve existing documentation
            proposedDoc = await this.aiGenerator.improveDocumentation(
                doc.items[0].content,
                change.newContent
            );
        }
        
        return {
            title: this.generateTitle(change),
            description: this.generateDescription(change),
            changeKind: this.determineChangeKind(doc, proposedDoc),
            content: proposedDoc,
            targetDoc: this.findTargetDoc(change.uri),
            rationale: await this.generateRationale(change),
            confidence: this.calculateConfidence(change, proposedDoc),
            autoSubmit: change.significance > 0.8 && this.calculateConfidence(change, proposedDoc) > 0.9
        };
    }
    
    private generateTitle(change: ChangeAnalysis): string {
        const action = change.hasDocumentation ? 'Update' : 'Add';
        const type = change.hasAPIChange ? 'API documentation' : 'documentation';
        const file = path.basename(change.uri.fsPath);
        
        return `${action} ${type} for ${file}`;
    }
    
    private async generateRationale(change: ChangeAnalysis): Promise<string> {
        const reasons = [];
        
        if (!change.hasDocumentation) {
            reasons.push('Added missing documentation');
        }
        
        if (change.hasAPIChange) {
            reasons.push('Updated to reflect API changes');
        }
        
        if (change.suggestions.length > 0) {
            reasons.push(`Implemented suggestions: ${change.suggestions.join(', ')}`);
        }
        
        return reasons.join('. ');
    }
}
```

#### 5. Performance Optimizer
```typescript
// src/intelligence/PerformanceOptimizer.ts
export class PerformanceOptimizer {
    private analysisCache = new LRUCache<string, AnalysisResult>(1000);
    private workerPool: Worker[] = [];
    
    constructor() {
        // Initialize worker pool for parallel processing
        for (let i = 0; i < navigator.hardwareConcurrency; i++) {
            this.workerPool.push(new Worker('./analysis.worker.js'));
        }
    }
    
    async optimizeBatch(files: vscode.Uri[]): Promise<void> {
        // Group files by size for optimal batching
        const groups = this.groupFilesBySize(files);
        
        // Process in parallel with worker pool
        const promises = groups.map((group, index) => 
            this.processGroup(group, this.workerPool[index % this.workerPool.length])
        );
        
        await Promise.all(promises);
    }
    
    private groupFilesBySize(files: vscode.Uri[]): vscode.Uri[][] {
        const groups: vscode.Uri[][] = [];
        let currentGroup: vscode.Uri[] = [];
        let currentSize = 0;
        const maxGroupSize = 1024 * 1024; // 1MB per group
        
        for (const file of files) {
            const stats = fs.statSync(file.fsPath);
            
            if (currentSize + stats.size > maxGroupSize && currentGroup.length > 0) {
                groups.push(currentGroup);
                currentGroup = [];
                currentSize = 0;
            }
            
            currentGroup.push(file);
            currentSize += stats.size;
        }
        
        if (currentGroup.length > 0) {
            groups.push(currentGroup);
        }
        
        return groups;
    }
    
    enableIncrementalAnalysis(): void {
        // Use incremental compilation for TypeScript
        this.createIncrementalProgram();
        
        // Enable file watching with optimal debouncing
        this.setupOptimizedWatchers();
        
        // Implement lazy loading for large files
        this.enableLazyLoading();
    }
}
```

## Deliverables

### Core Files
1. `src/intelligence/DocExtractor.ts` - Documentation extraction
2. `src/intelligence/AIDocGenerator.ts` - AI generation
3. `src/intelligence/ChangeDetector.ts` - Smart detection
4. `src/intelligence/ProposalGenerator.ts` - Auto proposals
5. `src/intelligence/PerformanceOptimizer.ts` - Optimization
6. `src/workers/analysis.worker.ts` - Background processing

### Features
1. ✅ Automatic documentation extraction
2. ✅ AI-powered documentation generation
3. ✅ Smart change significance detection
4. ✅ Auto-proposal generation
5. ✅ Performance optimization
6. ✅ Documentation coverage metrics
7. ✅ Parallel processing

### Intelligence Capabilities
- JSDoc/TSDoc extraction
- Function signature analysis
- API change detection
- Documentation quality scoring
- Auto-improvement suggestions
- Coverage analytics

## Implementation Steps

### Day 1: Documentation Extraction
- [ ] Implement TypeScript parser
- [ ] Add JavaScript support
- [ ] Extract JSDoc comments
- [ ] Parse function signatures
- [ ] Cache extracted data

### Day 2: AI Integration
- [ ] Set up AI client
- [ ] Create prompt templates
- [ ] Implement generation logic
- [ ] Add improvement capability
- [ ] Handle API failures

### Day 3: Smart Detection
- [ ] Build change analyzer
- [ ] Implement diff algorithm
- [ ] Add significance scoring
- [ ] Create priority system
- [ ] Generate suggestions

### Day 4: Proposal Generation
- [ ] Connect all components
- [ ] Auto-generate proposals
- [ ] Add confidence scoring
- [ ] Implement auto-submit
- [ ] Create review UI

### Day 5: Performance & Analytics
- [ ] Implement worker pool
- [ ] Add caching layer
- [ ] Optimize algorithms
- [ ] Create analytics dashboard
- [ ] Performance testing

## Configuration

```json
{
    "scribe.intelligence.enabled": {
        "type": "boolean",
        "default": true,
        "description": "Enable AI-powered features"
    },
    "scribe.intelligence.aiProvider": {
        "type": "string",
        "enum": ["anthropic", "openai", "local"],
        "default": "anthropic",
        "description": "AI provider for generation"
    },
    "scribe.intelligence.autoPropose": {
        "type": "boolean",
        "default": false,
        "description": "Automatically generate proposals"
    },
    "scribe.intelligence.minSignificance": {
        "type": "number",
        "default": 0.3,
        "description": "Minimum change significance (0-1)"
    },
    "scribe.intelligence.coverageTarget": {
        "type": "number",
        "default": 80,
        "description": "Target documentation coverage %"
    }
}
```

## Performance Metrics

### Extraction Performance
- < 100ms for average file
- < 1s for large files (>10k lines)
- Cache hit rate > 90%
- Memory usage < 50MB

### AI Generation
- < 2s for documentation generation
- < 3s for improvement suggestions
- Fallback to local < 500ms
- Batch processing support

### Change Detection
- < 50ms for diff computation
- < 200ms for significance analysis
- Real-time as-you-type support
- Debounced to 500ms

## Testing Strategy

### Unit Tests
- Parser accuracy for each language
- AI prompt generation
- Change significance calculation
- Proposal generation logic

### Integration Tests
- Full extraction → generation flow
- Change → proposal → submit flow
- Performance under load
- Cache effectiveness

### Quality Tests
- Documentation quality scoring
- AI generation accuracy
- False positive rate < 5%
- Coverage calculation accuracy

## Success Criteria

1. **Accuracy**
   - 95% extraction accuracy
   - 80% AI generation relevance
   - < 10% false positives

2. **Performance**
   - No noticeable IDE lag
   - < 3s end-to-end processing
   - Handles 1000+ files

3. **Intelligence**
   - Meaningful proposals
   - Accurate significance scoring
   - Helpful suggestions

4. **Coverage**
   - Track documentation coverage
   - Show improvement trends
   - Identify gaps

## Next Phase Preview

Phase 5 will focus on production readiness:
- Comprehensive testing suite
- CI/CD pipeline setup
- VS Code Marketplace preparation
- User documentation
- Launch strategy

---

**Status**: Ready to implement
**Estimated effort**: 40 hours
**Priority**: P2 - Intelligence Layer
**Dependencies**: Phase 3 completion