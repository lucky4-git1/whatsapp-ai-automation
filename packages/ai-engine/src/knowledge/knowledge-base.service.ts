/**
 * Knowledge Base Service
 * Handles document storage, retrieval, and semantic search using embeddings
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { v4 as uuidv4 } from 'uuid';
import {
  KnowledgeDocument,
  KnowledgeSource,
  KnowledgeBaseConfig,
  KnowledgeBaseError,
  SupportedLanguage,
} from '../types';
import { IAIProvider } from '../providers/provider.interface';

export interface UpsertDocumentOptions {
  workspaceId: string;
  title: string;
  content: string;
  language: SupportedLanguage;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface SearchOptions {
  workspaceId: string;
  query: string;
  language?: SupportedLanguage;
  limit?: number;
  similarityThreshold?: number;
  tags?: string[];
}

export class KnowledgeBaseService {
  private pinecone: Pinecone | null = null;
  private config: KnowledgeBaseConfig;
  private embeddingProvider: IAIProvider;
  private indexName: string;

  constructor(
    config: KnowledgeBaseConfig,
    embeddingProvider: IAIProvider
  ) {
    this.config = config;
    this.embeddingProvider = embeddingProvider;
    this.indexName = config.pineconeIndex || 'whatsapp-ai-knowledge';
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      console.log('Knowledge base is disabled');
      return;
    }

    if (
      !this.config.pineconeApiKey ||
      !this.config.pineconeEnvironment
    ) {
      throw new KnowledgeBaseError(
        'Pinecone API key and environment are required when knowledge base is enabled'
      );
    }

    try {
      this.pinecone = new Pinecone({
        apiKey: this.config.pineconeApiKey,
      });

      // Verify index exists
      const indexes = await this.pinecone.listIndexes();
      const indexExists = indexes.indexes?.some(
        (idx) => idx.name === this.indexName
      );

      if (!indexExists) {
        console.warn(
          `Pinecone index "${this.indexName}" does not exist. Please create it first.`
        );
      }
    } catch (error) {
      throw new KnowledgeBaseError(
        'Failed to initialize knowledge base',
        { originalError: error }
      );
    }
  }

  /**
   * Add or update a document in the knowledge base
   */
  async upsertDocument(
    options: UpsertDocumentOptions
  ): Promise<KnowledgeDocument> {
    if (!this.config.enabled || !this.pinecone) {
      throw new KnowledgeBaseError('Knowledge base is not enabled');
    }

    try {
      const documentId = uuidv4();

      // Generate embedding for the content
      const embedding = await this.embeddingProvider.generateEmbedding(
        options.content
      );

      // Prepare metadata
      const metadata = {
        workspaceId: options.workspaceId,
        title: options.title,
        content: options.content,
        language: options.language,
        tags: options.tags || [],
        ...options.metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Upsert to Pinecone
      const index = this.pinecone.index(this.indexName);
      await index.upsert([
        {
          id: documentId,
          values: embedding,
          metadata,
        },
      ]);

      return {
        id: documentId,
        workspaceId: options.workspaceId,
        title: options.title,
        content: options.content,
        language: options.language,
        tags: options.tags || [],
        metadata: options.metadata,
        embedding,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      throw new KnowledgeBaseError(
        'Failed to upsert document',
        { originalError: error }
      );
    }
  }

  /**
   * Search for relevant documents
   */
  async search(options: SearchOptions): Promise<KnowledgeSource[]> {
    if (!this.config.enabled || !this.pinecone) {
      return [];
    }

    try {
      // Generate query embedding
      const queryEmbedding =
        await this.embeddingProvider.generateEmbedding(options.query);

      // Build filter
      const filter: Record<string, any> = {
        workspaceId: { $eq: options.workspaceId },
      };

      if (options.language) {
        filter.language = { $eq: options.language };
      }

      if (options.tags && options.tags.length > 0) {
        filter.tags = { $in: options.tags };
      }

      // Query Pinecone
      const index = this.pinecone.index(this.indexName);
      const queryResponse = await index.query({
        vector: queryEmbedding,
        filter,
        topK: options.limit || this.config.maxResults || 5,
        includeMetadata: true,
      });

      // Filter by similarity threshold
      const threshold =
        options.similarityThreshold ||
        this.config.similarityThreshold ||
        0.7;

      const sources: KnowledgeSource[] = [];

      for (const match of queryResponse.matches || []) {
        if ((match.score || 0) >= threshold && match.metadata) {
          sources.push({
            id: match.id,
            content: (match.metadata.content as string) || '',
            title: (match.metadata.title as string) || 'Untitled',
            relevanceScore: match.score || 0,
            metadata: match.metadata,
          });
        }
      }

      return sources;
    } catch (error) {
      console.error('Knowledge base search error:', error);
      // Don't throw error - gracefully degrade to no knowledge base results
      return [];
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<void> {
    if (!this.config.enabled || !this.pinecone) {
      throw new KnowledgeBaseError('Knowledge base is not enabled');
    }

    try {
      const index = this.pinecone.index(this.indexName);
      await index.deleteOne(documentId);
    } catch (error) {
      throw new KnowledgeBaseError(
        'Failed to delete document',
        { originalError: error }
      );
    }
  }

  /**
   * Delete all documents for a workspace
   */
  async deleteWorkspaceDocuments(workspaceId: string): Promise<void> {
    if (!this.config.enabled || !this.pinecone) {
      throw new KnowledgeBaseError('Knowledge base is not enabled');
    }

    try {
      const index = this.pinecone.index(this.indexName);
      await index.deleteMany({
        workspaceId: { $eq: workspaceId },
      });
    } catch (error) {
      throw new KnowledgeBaseError(
        'Failed to delete workspace documents',
        { originalError: error }
      );
    }
  }

  /**
   * Get document count for a workspace
   */
  async getDocumentCount(workspaceId: string): Promise<number> {
    if (!this.config.enabled || !this.pinecone) {
      return 0;
    }

    try {
      const index = this.pinecone.index(this.indexName);
      const stats = await index.describeIndexStats();

      // Note: Pinecone doesn't provide filtered counts easily
      // This returns total count, not workspace-specific
      return stats.totalRecordCount || 0;
    } catch (error) {
      console.error('Failed to get document count:', error);
      return 0;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    if (!this.config.enabled || !this.pinecone) {
      return true; // Not enabled is considered healthy
    }

    try {
      const index = this.pinecone.index(this.indexName);
      await index.describeIndexStats();
      return true;
    } catch (error) {
      return false;
    }
  }
}
