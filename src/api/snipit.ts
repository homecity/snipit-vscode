import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import { EncryptedData, encrypt, decrypt, encryptWithPassword, decryptWithPassword } from '../utils/encryption';

export interface SnippetOptions {
  content: string;
  language?: string;
  fileName?: string;
  visibility: 'public' | 'password' | 'burn';
  expiry: '1h' | '24h' | '7d' | '30d' | 'never';
  password?: string;
}

export interface CreateSnippetResponse {
  id: string;
  url: string;
  expiresAt?: string;
}

export interface GetSnippetResponse {
  id: string;
  content?: string;
  encrypted?: EncryptedData;
  salt?: string;
  language?: string;
  fileName?: string;
  visibility: 'public' | 'password' | 'burn';
  createdAt: string;
  expiresAt?: string;
  burned?: boolean;
}

function getApiUrl(): string {
  const config = vscode.workspace.getConfiguration('snipit');
  return config.get<string>('apiUrl', 'https://snipit.sh');
}

function makeRequest<T>(
  method: string,
  url: string,
  data?: unknown
): Promise<T> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    const options: https.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'snipit-vscode/0.1.0'
      }
    };
    
    const req = protocol.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(body) as T);
          } else {
            const error = JSON.parse(body);
            reject(new Error(error.message || `HTTP ${res.statusCode}`));
          }
        } catch {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Creates a new snippet on snipit.sh
 * Returns the URL with encryption key in fragment if encrypted
 */
export async function createSnippet(options: SnippetOptions): Promise<{ url: string; id: string }> {
  const apiUrl = getApiUrl();
  
  let requestBody: Record<string, unknown>;
  
  // Calculate expiry timestamp
  const expiryMap: Record<string, number | null> = {
    '1h': 60 * 60,
    '24h': 24 * 60 * 60,
    '7d': 7 * 24 * 60 * 60,
    '30d': 30 * 24 * 60 * 60,
    'never': null
  };
  
  const expirySeconds = expiryMap[options.expiry];
  const expiresAt = expirySeconds 
    ? new Date(Date.now() + expirySeconds * 1000).toISOString()
    : undefined;
  
  // snipit.sh API expects 'content' field directly
  // Password protection and burn-after-read are handled server-side
  requestBody = {
    content: options.content,
    language: options.language,
    fileName: options.fileName,
    visibility: options.visibility,
    expiresAt,
    password: options.password  // Server handles password protection
  };
  
  const response = await makeRequest<CreateSnippetResponse>(
    'POST',
    `${apiUrl}/api/snippets`,
    requestBody
  );
  
  // Build the full URL
  const fullUrl = `${apiUrl}/${response.id}`;
  
  return {
    url: fullUrl,
    id: response.id
  };
}

/**
 * Retrieves a snippet from snipit.sh
 */
export async function getSnippet(
  idOrUrl: string,
  password?: string
): Promise<{ content: string; language?: string; fileName?: string }> {
  const apiUrl = getApiUrl();
  
  // Parse the URL to extract ID and encryption key
  let id: string;
  let encryptionKey: string | undefined;
  
  if (idOrUrl.includes('snipit.sh') || idOrUrl.includes('://')) {
    const url = new URL(idOrUrl);
    id = url.pathname.replace(/^\//, '').split('/')[0];
    encryptionKey = url.hash.replace(/^#/, '') || undefined;
  } else {
    id = idOrUrl;
  }
  
  const response = await makeRequest<GetSnippetResponse>(
    'GET',
    `${apiUrl}/api/snippets/${id}`
  );
  
  if (response.burned) {
    throw new Error('This snippet has been burned (already viewed)');
  }
  
  let content: string;
  
  if (response.content) {
    // Unencrypted content (shouldn't happen with current design)
    content = response.content;
  } else if (response.encrypted) {
    if (response.visibility === 'password') {
      if (!password) {
        throw new Error('Password required');
      }
      if (!response.salt) {
        throw new Error('Missing salt for password decryption');
      }
      content = decryptWithPassword(response.encrypted, password, response.salt);
    } else if (encryptionKey) {
      content = decrypt(response.encrypted, encryptionKey);
    } else {
      throw new Error('Encryption key required (should be in URL fragment)');
    }
  } else {
    throw new Error('No content found in snippet');
  }
  
  return {
    content,
    language: response.language,
    fileName: response.fileName
  };
}

/**
 * Parses a snipit.sh URL to extract components
 */
export function parseSnipitUrl(url: string): { id: string; key?: string } | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('snipit')) {
      return null;
    }
    const id = parsed.pathname.replace(/^\//, '').split('/')[0];
    const key = parsed.hash.replace(/^#/, '') || undefined;
    return { id, key };
  } catch {
    return null;
  }
}
