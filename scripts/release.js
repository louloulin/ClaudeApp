#!/usr/bin/env node

/**
 * Release Script for Claude Code UI
 * Handles version bumping, changelog generation, and release preparation
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Configuration
const RELEASE_TYPES = ['patch', 'minor', 'major'];
const CHANGELOG_FILE = path.join(projectRoot, 'CHANGELOG.md');
const PACKAGE_FILE = path.join(projectRoot, 'package.json');

class ReleaseManager {
  constructor() {
    this.currentVersion = this.getCurrentVersion();
    this.releaseType = process.argv[2] || 'patch';
    this.isDryRun = process.argv.includes('--dry-run');
    this.skipTests = process.argv.includes('--skip-tests');
  }

  getCurrentVersion() {
    const packageJson = JSON.parse(fs.readFileSync(PACKAGE_FILE, 'utf8'));
    return packageJson.version;
  }

  calculateNewVersion(type) {
    const [major, minor, patch] = this.currentVersion.split('.').map(Number);
    
    switch (type) {
      case 'major':
        return `${major + 1}.0.0`;
      case 'minor':
        return `${major}.${minor + 1}.0`;
      case 'patch':
        return `${major}.${minor}.${patch + 1}`;
      default:
        throw new Error(`Invalid release type: ${type}`);
    }
  }

  async runCommand(command, description) {
    console.log(`🔄 ${description}...`);
    if (this.isDryRun) {
      console.log(`   [DRY RUN] Would run: ${command}`);
      return '';
    }
    
    try {
      const output = execSync(command, { 
        cwd: projectRoot, 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      console.log(`✅ ${description} completed`);
      return output;
    } catch (error) {
      console.error(`❌ ${description} failed:`, error.message);
      throw error;
    }
  }

  async validateEnvironment() {
    console.log('🔍 Validating environment...');
    
    // Check if we're on main branch
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    if (currentBranch !== 'main' && currentBranch !== 'master') {
      throw new Error(`Must be on main/master branch. Current branch: ${currentBranch}`);
    }

    // Check for uncommitted changes
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      throw new Error('Working directory must be clean. Commit or stash changes first.');
    }

    // Check if release type is valid
    if (!RELEASE_TYPES.includes(this.releaseType)) {
      throw new Error(`Invalid release type: ${this.releaseType}. Must be one of: ${RELEASE_TYPES.join(', ')}`);
    }

    console.log('✅ Environment validation passed');
  }

  async runTests() {
    if (this.skipTests) {
      console.log('⏭️  Skipping tests');
      return;
    }

    await this.runCommand('npm test', 'Running tests');
    await this.runCommand('npm run test:coverage', 'Running test coverage');
    await this.runCommand('node scripts/verify-pwa.js', 'Verifying PWA functionality');
  }

  async buildProject() {
    await this.runCommand('npm run build', 'Building project');
    await this.runCommand('npm run build:mobile', 'Building mobile apps');
  }

  updateVersion(newVersion) {
    console.log(`📝 Updating version from ${this.currentVersion} to ${newVersion}...`);
    
    if (this.isDryRun) {
      console.log(`   [DRY RUN] Would update package.json version to ${newVersion}`);
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(PACKAGE_FILE, 'utf8'));
    packageJson.version = newVersion;
    fs.writeFileSync(PACKAGE_FILE, JSON.stringify(packageJson, null, 2) + '\n');
    
    console.log('✅ Version updated in package.json');
  }

  generateChangelog(newVersion) {
    console.log('📋 Generating changelog...');
    
    if (this.isDryRun) {
      console.log('   [DRY RUN] Would generate changelog');
      return;
    }

    const date = new Date().toISOString().split('T')[0];
    const changelogEntry = `\n## [${newVersion}] - ${date}\n\n### Added\n- Release ${newVersion}\n\n### Changed\n- Version bump to ${newVersion}\n\n### Fixed\n- Bug fixes and improvements\n\n`;
    
    if (fs.existsSync(CHANGELOG_FILE)) {
      const existingChangelog = fs.readFileSync(CHANGELOG_FILE, 'utf8');
      const updatedChangelog = existingChangelog.replace(
        /^(# Changelog\n)/,
        `$1${changelogEntry}`
      );
      fs.writeFileSync(CHANGELOG_FILE, updatedChangelog);
    } else {
      const newChangelog = `# Changelog\n\nAll notable changes to this project will be documented in this file.\n${changelogEntry}`;
      fs.writeFileSync(CHANGELOG_FILE, newChangelog);
    }
    
    console.log('✅ Changelog updated');
  }

  async commitAndTag(newVersion) {
    await this.runCommand('git add .', 'Staging changes');
    await this.runCommand(`git commit -m "chore: release v${newVersion}"`, 'Committing release');
    await this.runCommand(`git tag -a v${newVersion} -m "Release v${newVersion}"`, 'Creating tag');
  }

  async pushRelease() {
    await this.runCommand('git push origin main', 'Pushing to main branch');
    await this.runCommand('git push origin --tags', 'Pushing tags');
  }

  async release() {
    try {
      console.log(`🚀 Starting release process for ${this.releaseType} version...`);
      console.log(`📦 Current version: ${this.currentVersion}`);
      
      const newVersion = this.calculateNewVersion(this.releaseType);
      console.log(`📦 New version: ${newVersion}`);

      if (this.isDryRun) {
        console.log('\n🔍 DRY RUN MODE - No changes will be made\n');
      }

      await this.validateEnvironment();
      await this.runTests();
      await this.buildProject();
      
      this.updateVersion(newVersion);
      this.generateChangelog(newVersion);
      
      await this.commitAndTag(newVersion);
      await this.pushRelease();

      console.log('\n🎉 Release completed successfully!');
      console.log(`📦 Version ${newVersion} has been released`);
      console.log(`🏷️  Tag: v${newVersion}`);
      console.log('\n📋 Next steps:');
      console.log('   1. Check GitHub Actions for automated deployment');
      console.log('   2. Verify the release on GitHub Releases page');
      console.log('   3. Update documentation if needed');

    } catch (error) {
      console.error('\n❌ Release failed:', error.message);
      process.exit(1);
    }
  }
}

// Show usage if no arguments provided
if (process.argv.length < 3) {
  console.log(`
Usage: node scripts/release.js <release-type> [options]

Release types:
  patch   - Bug fixes (1.0.0 -> 1.0.1)
  minor   - New features (1.0.0 -> 1.1.0)
  major   - Breaking changes (1.0.0 -> 2.0.0)

Options:
  --dry-run     - Show what would be done without making changes
  --skip-tests  - Skip running tests

Examples:
  node scripts/release.js patch
  node scripts/release.js minor --dry-run
  node scripts/release.js major --skip-tests
`);
  process.exit(0);
}

// Run the release
const releaseManager = new ReleaseManager();
releaseManager.release();
