/**
 * RSA密钥管理模块
 * 用于OIDC ID Token签名 (RS256)
 */
import * as jose from 'jose';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const KEYS_DIR = path.join(process.cwd(), '.keys');
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'private.pem');
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, 'public.pem');
const KID_PATH = path.join(KEYS_DIR, 'kid.txt');

interface KeyPair {
  privateKey: crypto.KeyObject;
  publicKey: crypto.KeyObject;
  kid: string;
}

let cachedKeyPair: KeyPair | null = null;

/**
 * 生成新的RSA密钥对
 */
function generateKeyPair(): { privateKey: string; publicKey: string; kid: string } {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  // 生成Key ID (用于JWKS)
  const kid = crypto.randomBytes(16).toString('hex');

  return { privateKey, publicKey, kid };
}

/**
 * 确保密钥目录存在
 */
function ensureKeysDir() {
  if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true });
  }
}

/**
 * 加载或生成密钥对
 */
export function loadOrCreateKeyPair(): KeyPair {
  if (cachedKeyPair) {
    return cachedKeyPair;
  }

  // 检查环境变量中是否有密钥（用于生产环境）
  const envPrivateKey = process.env.RSA_PRIVATE_KEY;
  const envPublicKey = process.env.RSA_PUBLIC_KEY;
  const envKid = process.env.RSA_KEY_ID;

  if (envPrivateKey && envPublicKey && envKid) {
    cachedKeyPair = {
      privateKey: crypto.createPrivateKey(envPrivateKey.replace(/\\n/g, '\n')),
      publicKey: crypto.createPublicKey(envPublicKey.replace(/\\n/g, '\n')),
      kid: envKid,
    };
    return cachedKeyPair;
  }

  // 从文件加载
  ensureKeysDir();

  if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUBLIC_KEY_PATH) && fs.existsSync(KID_PATH)) {
    const privateKeyPem = fs.readFileSync(PRIVATE_KEY_PATH, 'utf-8');
    const publicKeyPem = fs.readFileSync(PUBLIC_KEY_PATH, 'utf-8');
    const kid = fs.readFileSync(KID_PATH, 'utf-8').trim();

    cachedKeyPair = {
      privateKey: crypto.createPrivateKey(privateKeyPem),
      publicKey: crypto.createPublicKey(publicKeyPem),
      kid,
    };
    return cachedKeyPair;
  }

  // 生成新密钥对并保存
  console.log('正在生成新的RSA密钥对...');
  const { privateKey, publicKey, kid } = generateKeyPair();

  fs.writeFileSync(PRIVATE_KEY_PATH, privateKey, { mode: 0o600 });
  fs.writeFileSync(PUBLIC_KEY_PATH, publicKey);
  fs.writeFileSync(KID_PATH, kid);

  cachedKeyPair = {
    privateKey: crypto.createPrivateKey(privateKey),
    publicKey: crypto.createPublicKey(publicKey),
    kid,
  };

  console.log('RSA密钥对已生成并保存到 .keys/ 目录');

  return cachedKeyPair;
}

/**
 * 获取JWKS格式的公钥
 */
export async function getJWKS(): Promise<{ keys: jose.JWK[] }> {
  const { publicKey, kid } = loadOrCreateKeyPair();

  const jwk = await jose.exportJWK(publicKey);
  jwk.kid = kid;
  jwk.use = 'sig';
  jwk.alg = 'RS256';

  return {
    keys: [jwk],
  };
}

/**
 * 使用RS256签名JWT
 */
export async function signJWT(payload: jose.JWTPayload): Promise<string> {
  const { privateKey, kid } = loadOrCreateKeyPair();

  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid })
    .sign(privateKey);

  return jwt;
}
