import { encoding_for_model } from 'tiktoken';

export interface TextChunk {
  content: string;
  tokenCount: number;
  index: number;
  metadata?: {
    startChar: number;
    endChar: number;
  };
}

/**
 * Chunks text into semantic pieces based on token count
 * Uses sentence boundaries to avoid splitting mid-sentence
 */
export class DocumentChunker {
  private encoder;
  private maxTokens: number;
  private overlap: number;

  constructor(maxTokens = 500, overlap = 50) {
    this.encoder = encoding_for_model('gpt-3.5-turbo');
    this.maxTokens = maxTokens;
    this.overlap = overlap;
  }

  /**
   * Split text into chunks while respecting sentence boundaries
   */
  chunkText(text: string): TextChunk[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    // Split by sentence endings
    const sentences = this.splitIntoSentences(text);
    const chunks: TextChunk[] = [];
    let currentChunk: string[] = [];
    let currentTokenCount = 0;
    let chunkIndex = 0;
    let charIndex = 0;

    for (const sentence of sentences) {
      const sentenceTokens = this.countTokens(sentence);
      
      // If single sentence exceeds max tokens, split it
      if (sentenceTokens > this.maxTokens) {
        // Save current chunk if it has content
        if (currentChunk.length > 0) {
          chunks.push(this.createChunk(
            currentChunk.join(' '),
            chunkIndex++,
            charIndex
          ));
          charIndex += currentChunk.join(' ').length;
          currentChunk = [];
          currentTokenCount = 0;
        }
        
        // Split long sentence
        const subChunks = this.splitLongSentence(sentence, chunkIndex);
        chunks.push(...subChunks);
        chunkIndex += subChunks.length;
        charIndex += sentence.length;
        continue;
      }
      
      // Check if adding this sentence would exceed limit
      if (currentTokenCount + sentenceTokens > this.maxTokens) {
        // Save current chunk
        chunks.push(this.createChunk(
          currentChunk.join(' '),
          chunkIndex++,
          charIndex
        ));
        charIndex += currentChunk.join(' ').length;
        
        // Start new chunk with overlap from previous
        currentChunk = this.getOverlapSentences(currentChunk);
        currentTokenCount = this.countTokens(currentChunk.join(' '));
      }
      
      currentChunk.push(sentence);
      currentTokenCount += sentenceTokens;
    }
    
    // Add remaining content
    if (currentChunk.length > 0) {
      chunks.push(this.createChunk(
        currentChunk.join(' '),
        chunkIndex,
        charIndex
      ));
    }
    
    return chunks;
  }

  /**
   * Chunk markdown document with special handling for code blocks
   */
  chunkMarkdown(markdown: string): TextChunk[] {
    const chunks: TextChunk[] = [];
    const sections = this.splitMarkdownSections(markdown);
    let chunkIndex = 0;
    
    for (const section of sections) {
      if (section.type === 'code') {
        // Keep code blocks together if possible
        const tokens = this.countTokens(section.content);
        if (tokens <= this.maxTokens) {
          chunks.push(this.createChunk(section.content, chunkIndex++, 0));
        } else {
          // Split large code blocks
          const codeChunks = this.chunkText(section.content);
          codeChunks.forEach((chunk, i) => {
            chunks.push({
              ...chunk,
              index: chunkIndex++
            });
          });
        }
      } else {
        // Regular text chunking
        const textChunks = this.chunkText(section.content);
        textChunks.forEach((chunk, i) => {
          chunks.push({
            ...chunk,
            index: chunkIndex++
          });
        });
      }
    }
    
    return chunks;
  }

  private splitIntoSentences(text: string): string[] {
    // Improved sentence splitting with abbreviation handling
    const sentenceEndings = /([.!?]+)\s+(?=[A-Z])/g;
    const prelimSentences = text.split(sentenceEndings);
    
    const sentences: string[] = [];
    for (let i = 0; i < prelimSentences.length; i += 2) {
      const sentence = prelimSentences[i] + (prelimSentences[i + 1] || '');
      if (sentence.trim()) {
        sentences.push(sentence.trim());
      }
    }
    
    return sentences.length > 0 ? sentences : [text];
  }

  private splitLongSentence(sentence: string, startIndex: number): TextChunk[] {
    const words = sentence.split(/\s+/);
    const chunks: TextChunk[] = [];
    let currentWords: string[] = [];
    let currentTokens = 0;
    let chunkIndex = startIndex;
    
    for (const word of words) {
      const wordTokens = this.countTokens(word);
      if (currentTokens + wordTokens > this.maxTokens && currentWords.length > 0) {
        chunks.push(this.createChunk(
          currentWords.join(' '),
          chunkIndex++,
          0
        ));
        currentWords = [];
        currentTokens = 0;
      }
      currentWords.push(word);
      currentTokens += wordTokens;
    }
    
    if (currentWords.length > 0) {
      chunks.push(this.createChunk(
        currentWords.join(' '),
        chunkIndex,
        0
      ));
    }
    
    return chunks;
  }

  private getOverlapSentences(sentences: string[]): string[] {
    if (sentences.length === 0 || this.overlap === 0) {
      return [];
    }
    
    const overlapSentences: string[] = [];
    let tokenCount = 0;
    
    // Add sentences from the end until we reach overlap token count
    for (let i = sentences.length - 1; i >= 0; i--) {
      const sentenceTokens = this.countTokens(sentences[i]);
      if (tokenCount + sentenceTokens <= this.overlap) {
        overlapSentences.unshift(sentences[i]);
        tokenCount += sentenceTokens;
      } else {
        break;
      }
    }
    
    return overlapSentences;
  }

  private splitMarkdownSections(markdown: string): Array<{type: string, content: string}> {
    const sections: Array<{type: string, content: string}> = [];
    const codeBlockRegex = /```[\s\S]*?```/g;
    let lastIndex = 0;
    let match;
    
    while ((match = codeBlockRegex.exec(markdown)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        sections.push({
          type: 'text',
          content: markdown.slice(lastIndex, match.index)
        });
      }
      
      // Add code block
      sections.push({
        type: 'code',
        content: match[0]
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < markdown.length) {
      sections.push({
        type: 'text',
        content: markdown.slice(lastIndex)
      });
    }
    
    return sections;
  }

  private createChunk(content: string, index: number, startChar: number): TextChunk {
    return {
      content: content.trim(),
      tokenCount: this.countTokens(content),
      index,
      metadata: {
        startChar,
        endChar: startChar + content.length
      }
    };
  }

  private countTokens(text: string): number {
    if (!text) return 0;
    return this.encoder.encode(text).length;
  }

  cleanup() {
    this.encoder.free();
  }
}