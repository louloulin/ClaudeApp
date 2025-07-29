import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const router = express.Router();
const execAsync = promisify(exec);

// 数据存储路径
const CONFIG_DIR = path.join(process.cwd(), 'data', 'git-config');
const PLATFORMS_FILE = path.join(CONFIG_DIR, 'platforms.json');
const CREDENTIALS_FILE = path.join(CONFIG_DIR, 'credentials.json');
const SSH_KEYS_FILE = path.join(CONFIG_DIR, 'ssh-keys.json');
const USER_CONFIG_FILE = path.join(CONFIG_DIR, 'user-config.json');

// 确保配置目录存在
const ensureConfigDir = async () => {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  } catch (error) {
    console.error('创建配置目录失败:', error);
  }
};

// 加密/解密工具
const ENCRYPTION_KEY = process.env.GIT_CONFIG_ENCRYPTION_KEY || 'default-key-change-in-production';

const encrypt = (text) => {
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

const decrypt = (encryptedText) => {
  try {
    const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return null;
  }
};

// 读取JSON文件
const readJsonFile = async (filePath, defaultValue = []) => {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return defaultValue;
  }
};

// 写入JSON文件
const writeJsonFile = async (filePath, data) => {
  await ensureConfigDir();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
};

// 平台管理API
router.get('/platforms', async (req, res) => {
  try {
    const platforms = await readJsonFile(PLATFORMS_FILE);
    res.json({ success: true, platforms });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/platforms', async (req, res) => {
  try {
    const { name, type, baseUrl, apiUrl } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({ success: false, error: '平台名称和类型不能为空' });
    }

    const platforms = await readJsonFile(PLATFORMS_FILE);
    const newPlatform = {
      id: crypto.randomUUID(),
      name,
      type,
      baseUrl: baseUrl || '',
      apiUrl: apiUrl || '',
      createdAt: new Date().toISOString()
    };

    platforms.push(newPlatform);
    await writeJsonFile(PLATFORMS_FILE, platforms);
    
    res.json({ success: true, platform: newPlatform });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/platforms/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, baseUrl, apiUrl } = req.body;
    
    const platforms = await readJsonFile(PLATFORMS_FILE);
    const platformIndex = platforms.findIndex(p => p.id === id);
    
    if (platformIndex === -1) {
      return res.status(404).json({ success: false, error: '平台不存在' });
    }

    platforms[platformIndex] = {
      ...platforms[platformIndex],
      name,
      type,
      baseUrl: baseUrl || '',
      apiUrl: apiUrl || '',
      updatedAt: new Date().toISOString()
    };

    await writeJsonFile(PLATFORMS_FILE, platforms);
    
    res.json({ success: true, platform: platforms[platformIndex] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/platforms/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const platforms = await readJsonFile(PLATFORMS_FILE);
    const filteredPlatforms = platforms.filter(p => p.id !== id);
    
    if (platforms.length === filteredPlatforms.length) {
      return res.status(404).json({ success: false, error: '平台不存在' });
    }

    await writeJsonFile(PLATFORMS_FILE, filteredPlatforms);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 凭据管理API
router.get('/credentials', async (req, res) => {
  try {
    const credentials = await readJsonFile(CREDENTIALS_FILE);
    // 不返回敏感信息，只返回基本信息
    const safeCredentials = credentials.map(cred => ({
      id: cred.id,
      name: cred.name,
      type: cred.type,
      platform: cred.platform,
      username: cred.username,
      createdAt: cred.createdAt,
      updatedAt: cred.updatedAt
    }));
    res.json({ success: true, credentials: safeCredentials });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/credentials', async (req, res) => {
  try {
    const { name, type, platform, username, password, token } = req.body;
    
    if (!name || !type || !platform) {
      return res.status(400).json({ success: false, error: '名称、类型和平台不能为空' });
    }

    const credentials = await readJsonFile(CREDENTIALS_FILE);
    const newCredential = {
      id: crypto.randomUUID(),
      name,
      type,
      platform,
      username: username || '',
      password: password ? encrypt(password) : '',
      token: token ? encrypt(token) : '',
      createdAt: new Date().toISOString()
    };

    credentials.push(newCredential);
    await writeJsonFile(CREDENTIALS_FILE, credentials);
    
    // 返回安全的凭据信息
    const safeCredential = {
      id: newCredential.id,
      name: newCredential.name,
      type: newCredential.type,
      platform: newCredential.platform,
      username: newCredential.username,
      createdAt: newCredential.createdAt
    };
    
    res.json({ success: true, credential: safeCredential });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/credentials/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, platform, username, password, token } = req.body;
    
    const credentials = await readJsonFile(CREDENTIALS_FILE);
    const credentialIndex = credentials.findIndex(c => c.id === id);
    
    if (credentialIndex === -1) {
      return res.status(404).json({ success: false, error: '凭据不存在' });
    }

    const existingCredential = credentials[credentialIndex];
    credentials[credentialIndex] = {
      ...existingCredential,
      name,
      type,
      platform,
      username: username || '',
      password: password ? encrypt(password) : existingCredential.password,
      token: token ? encrypt(token) : existingCredential.token,
      updatedAt: new Date().toISOString()
    };

    await writeJsonFile(CREDENTIALS_FILE, credentials);
    
    // 返回安全的凭据信息
    const safeCredential = {
      id: credentials[credentialIndex].id,
      name: credentials[credentialIndex].name,
      type: credentials[credentialIndex].type,
      platform: credentials[credentialIndex].platform,
      username: credentials[credentialIndex].username,
      updatedAt: credentials[credentialIndex].updatedAt
    };
    
    res.json({ success: true, credential: safeCredential });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/credentials/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const credentials = await readJsonFile(CREDENTIALS_FILE);
    const filteredCredentials = credentials.filter(c => c.id !== id);
    
    if (credentials.length === filteredCredentials.length) {
      return res.status(404).json({ success: false, error: '凭据不存在' });
    }

    await writeJsonFile(CREDENTIALS_FILE, filteredCredentials);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// SSH密钥管理API
router.get('/ssh-keys', async (req, res) => {
  try {
    const sshKeys = await readJsonFile(SSH_KEYS_FILE);
    // 不返回私钥，只返回公钥和基本信息
    const safeSshKeys = sshKeys.map(key => ({
      id: key.id,
      name: key.name,
      type: key.type,
      size: key.size,
      fingerprint: key.fingerprint,
      publicKey: key.publicKey,
      createdAt: key.createdAt
    }));
    res.json({ success: true, sshKeys: safeSshKeys });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/ssh-keys/generate', async (req, res) => {
  try {
    const { name, type = 'rsa', size = 2048, comment } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, error: '密钥名称不能为空' });
    }

    // 生成SSH密钥对
    const keyPath = path.join(CONFIG_DIR, `ssh_${crypto.randomUUID()}`);
    const sshKeygenCmd = `ssh-keygen -t ${type} -b ${size} -f ${keyPath} -N "" -C "${comment || name}"`;
    
    await execAsync(sshKeygenCmd);
    
    // 读取生成的密钥
    const privateKey = await fs.readFile(keyPath, 'utf8');
    const publicKey = await fs.readFile(`${keyPath}.pub`, 'utf8');
    
    // 计算指纹
    const fingerprintCmd = `ssh-keygen -lf ${keyPath}.pub`;
    const { stdout: fingerprintOutput } = await execAsync(fingerprintCmd);
    const fingerprint = fingerprintOutput.trim().split(' ')[1];
    
    // 清理临时文件
    await fs.unlink(keyPath);
    await fs.unlink(`${keyPath}.pub`);
    
    const sshKeys = await readJsonFile(SSH_KEYS_FILE);
    const newSshKey = {
      id: crypto.randomUUID(),
      name,
      type,
      size,
      fingerprint,
      publicKey: publicKey.trim(),
      privateKey: encrypt(privateKey),
      comment: comment || '',
      createdAt: new Date().toISOString()
    };

    sshKeys.push(newSshKey);
    await writeJsonFile(SSH_KEYS_FILE, sshKeys);
    
    // 返回安全的SSH密钥信息
    const safeSshKey = {
      id: newSshKey.id,
      name: newSshKey.name,
      type: newSshKey.type,
      size: newSshKey.size,
      fingerprint: newSshKey.fingerprint,
      publicKey: newSshKey.publicKey,
      createdAt: newSshKey.createdAt
    };
    
    res.json({ success: true, sshKey: safeSshKey });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/ssh-keys/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const sshKeys = await readJsonFile(SSH_KEYS_FILE);
    const filteredSshKeys = sshKeys.filter(k => k.id !== id);
    
    if (sshKeys.length === filteredSshKeys.length) {
      return res.status(404).json({ success: false, error: 'SSH密钥不存在' });
    }

    await writeJsonFile(SSH_KEYS_FILE, filteredSshKeys);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/ssh-keys/test', async (req, res) => {
  try {
    const { keyId, host = 'github.com' } = req.body;
    
    const sshKeys = await readJsonFile(SSH_KEYS_FILE);
    const sshKey = sshKeys.find(k => k.id === keyId);
    
    if (!sshKey) {
      return res.status(404).json({ success: false, error: 'SSH密钥不存在' });
    }

    // 创建临时密钥文件进行测试
    const tempKeyPath = path.join(CONFIG_DIR, `temp_${crypto.randomUUID()}`);
    const privateKey = decrypt(sshKey.privateKey);
    
    if (!privateKey) {
      return res.status(500).json({ success: false, error: '无法解密私钥' });
    }

    await fs.writeFile(tempKeyPath, privateKey, { mode: 0o600 });
    
    try {
      // 测试SSH连接
      const testCmd = `ssh -i ${tempKeyPath} -o StrictHostKeyChecking=no -o ConnectTimeout=10 -T git@${host}`;
      await execAsync(testCmd);
      
      res.json({ success: true, message: 'SSH连接测试成功' });
    } catch (error) {
      // SSH测试可能会返回非零退出码但仍然成功
      if (error.stdout && error.stdout.includes('successfully authenticated')) {
        res.json({ success: true, message: 'SSH连接测试成功' });
      } else {
        res.json({ success: false, error: 'SSH连接测试失败: ' + error.message });
      }
    } finally {
      // 清理临时文件
      try {
        await fs.unlink(tempKeyPath);
      } catch (cleanupError) {
        console.error('清理临时文件失败:', cleanupError);
      }
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Git用户配置API
router.get('/user', async (req, res) => {
  try {
    const userConfig = await readJsonFile(USER_CONFIG_FILE, { name: '', email: '' });
    res.json({ success: true, user: userConfig });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/user', async (req, res) => {
  try {
    const { name, email } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ success: false, error: '用户名和邮箱不能为空' });
    }

    const userConfig = { name, email, updatedAt: new Date().toISOString() };
    await writeJsonFile(USER_CONFIG_FILE, userConfig);
    
    // 同时更新Git全局配置
    try {
      await execAsync(`git config --global user.name "${name}"`);
      await execAsync(`git config --global user.email "${email}"`);
    } catch (gitError) {
      console.warn('更新Git全局配置失败:', gitError.message);
    }
    
    res.json({ success: true, user: userConfig });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;