import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { promises as fs } from 'fs';
import { extractProjectDirectory } from '../projects.js';

const router = express.Router();
const execAsync = promisify(exec);

// Helper function to get the actual project path from the encoded project name
async function getActualProjectPath(projectName) {
  try {
    return await extractProjectDirectory(projectName);
  } catch (error) {
    console.error(`Error extracting project directory for ${projectName}:`, error);
    // Fallback to the old method
    return '/' + projectName.replace(/-/g, '/');
  }
}

// Helper function to validate git repository
async function validateGitRepository(projectPath) {
  try {
    // Check if directory exists
    await fs.access(projectPath);
  } catch {
    throw new Error(`Project path not found: ${projectPath}`);
  }

  try {
    // Use --show-toplevel to get the root of the git repository
    const { stdout: gitRoot } = await execAsync('git rev-parse --show-toplevel', { cwd: projectPath });
    const normalizedGitRoot = path.resolve(gitRoot.trim());
    const normalizedProjectPath = path.resolve(projectPath);
    
    // Ensure the git root matches our project path (prevent using parent git repos)
    if (normalizedGitRoot !== normalizedProjectPath) {
      throw new Error(`Project directory is not a git repository. This directory is inside a git repository at ${normalizedGitRoot}, but git operations should be run from the repository root.`);
    }
  } catch (error) {
    if (error.message.includes('Project directory is not a git repository')) {
      throw error;
    }
    throw new Error('Not a git repository. This directory does not contain a .git folder. Initialize a git repository with "git init" to use source control features.');
  }
}

// ==================== MERGE CONFLICT RESOLUTION ====================

// Get list of files with merge conflicts
router.get('/conflicts', async (req, res) => {
  const { project } = req.query;
  
  if (!project) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  try {
    const projectPath = await getActualProjectPath(project);
    await validateGitRepository(projectPath);

    // Check if we're in a merge state
    const mergeHeadPath = path.join(projectPath, '.git', 'MERGE_HEAD');
    let isMerging = false;
    try {
      await fs.access(mergeHeadPath);
      isMerging = true;
    } catch {
      // Not in merge state
    }

    // Get files with conflicts
    const { stdout: statusOutput } = await execAsync('git status --porcelain', { cwd: projectPath });
    
    const conflictFiles = [];
    statusOutput.split('\n').forEach(line => {
      if (!line.trim()) return;
      
      const status = line.substring(0, 2);
      const file = line.substring(3);
      
      // UU = both modified (conflict)
      // AA = both added (conflict)
      // DD = both deleted (conflict)
      if (status === 'UU' || status === 'AA' || status === 'DD') {
        conflictFiles.push({
          path: file,
          status: status === 'UU' ? 'both_modified' : status === 'AA' ? 'both_added' : 'both_deleted'
        });
      }
    });

    res.json({
      success: true,
      isMerging,
      conflicts: conflictFiles
    });
  } catch (error) {
    console.error('Git conflicts error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get conflict content for a specific file
router.get('/conflicts/:filePath', async (req, res) => {
  const { project } = req.query;
  const { filePath } = req.params;
  
  if (!project || !filePath) {
    return res.status(400).json({ error: 'Project name and file path are required' });
  }

  try {
    const projectPath = await getActualProjectPath(project);
    await validateGitRepository(projectPath);

    // Read the file content with conflict markers
    const fullPath = path.join(projectPath, decodeURIComponent(filePath));
    const content = await fs.readFile(fullPath, 'utf-8');

    // Parse conflict markers
    const lines = content.split('\n');
    const conflicts = [];
    let currentConflict = null;
    let lineNumber = 0;

    for (const line of lines) {
      lineNumber++;
      
      if (line.startsWith('<<<<<<<')) {
        currentConflict = {
          startLine: lineNumber,
          ourVersion: [],
          theirVersion: [],
          base: []
        };
      } else if (line.startsWith('=======') && currentConflict) {
        currentConflict.separatorLine = lineNumber;
      } else if (line.startsWith('>>>>>>>') && currentConflict) {
        currentConflict.endLine = lineNumber;
        conflicts.push(currentConflict);
        currentConflict = null;
      } else if (currentConflict) {
        if (!currentConflict.separatorLine) {
          currentConflict.ourVersion.push(line);
        } else {
          currentConflict.theirVersion.push(line);
        }
      }
    }

    res.json({
      success: true,
      content,
      conflicts
    });
  } catch (error) {
    console.error('Git conflict content error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Resolve conflict by choosing a version
router.post('/conflicts/resolve', async (req, res) => {
  const { project, filePath, resolution, content } = req.body;
  
  if (!project || !filePath || (!resolution && !content)) {
    return res.status(400).json({ error: 'Project name, file path, and resolution method or content are required' });
  }

  try {
    const projectPath = await getActualProjectPath(project);
    await validateGitRepository(projectPath);

    const fullPath = path.join(projectPath, filePath);

    if (content) {
      // Manual resolution - write the provided content
      await fs.writeFile(fullPath, content, 'utf-8');
    } else {
      // Automatic resolution
      switch (resolution) {
        case 'ours':
          await execAsync(`git checkout --ours "${filePath}"`, { cwd: projectPath });
          break;
        case 'theirs':
          await execAsync(`git checkout --theirs "${filePath}"`, { cwd: projectPath });
          break;
        default:
          return res.status(400).json({ error: 'Invalid resolution method. Use "ours", "theirs", or provide content.' });
      }
    }

    // Stage the resolved file
    await execAsync(`git add "${filePath}"`, { cwd: projectPath });

    res.json({ success: true, message: `Conflict resolved for ${filePath}` });
  } catch (error) {
    console.error('Git resolve conflict error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Abort merge
router.post('/merge/abort', async (req, res) => {
  const { project } = req.body;
  
  if (!project) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  try {
    const projectPath = await getActualProjectPath(project);
    await validateGitRepository(projectPath);

    const { stdout } = await execAsync('git merge --abort', { cwd: projectPath });
    
    res.json({ success: true, output: stdout || 'Merge aborted successfully' });
  } catch (error) {
    console.error('Git merge abort error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Continue merge after resolving conflicts
router.post('/merge/continue', async (req, res) => {
  const { project, message } = req.body;
  
  if (!project) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  try {
    const projectPath = await getActualProjectPath(project);
    await validateGitRepository(projectPath);

    // Check if all conflicts are resolved
    const { stdout: statusOutput } = await execAsync('git status --porcelain', { cwd: projectPath });
    const hasConflicts = statusOutput.split('\n').some(line => {
      const status = line.substring(0, 2);
      return status === 'UU' || status === 'AA' || status === 'DD';
    });

    if (hasConflicts) {
      return res.status(400).json({ error: 'There are still unresolved conflicts. Please resolve all conflicts before continuing.' });
    }

    // Continue merge
    const commitMessage = message || 'Merge commit';
    const { stdout } = await execAsync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, { cwd: projectPath });
    
    res.json({ success: true, output: stdout || 'Merge completed successfully' });
  } catch (error) {
    console.error('Git merge continue error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== STASH MANAGEMENT ====================

// Get list of stashes
router.get('/stash', async (req, res) => {
  const { project } = req.query;
  
  if (!project) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  try {
    const projectPath = await getActualProjectPath(project);
    await validateGitRepository(projectPath);

    // Get stash list
    const { stdout } = await execAsync('git stash list --pretty=format:"%H|%gd|%gs|%cr"', { cwd: projectPath });
    
    const stashes = stdout
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [hash, ref, message, date] = line.split('|');
        return {
          hash,
          ref,
          message,
          date,
          index: parseInt(ref.match(/stash@\{(\d+)\}/)?.[1] || '0')
        };
      });

    res.json({ success: true, stashes });
  } catch (error) {
    console.error('Git stash list error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new stash
router.post('/stash', async (req, res) => {
  const { project, message, includeUntracked = false } = req.body;
  
  if (!project) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  try {
    const projectPath = await getActualProjectPath(project);
    await validateGitRepository(projectPath);

    // Create stash
    const stashMessage = message || 'WIP: stash created from UI';
    const untrackedFlag = includeUntracked ? '-u' : '';
    const { stdout } = await execAsync(`git stash push ${untrackedFlag} -m "${stashMessage.replace(/"/g, '\\"')}"`, { cwd: projectPath });
    
    res.json({ success: true, output: stdout || 'Stash created successfully' });
  } catch (error) {
    console.error('Git stash create error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Apply a stash
router.post('/stash/:index/apply', async (req, res) => {
  const { project } = req.body;
  const { index } = req.params;
  
  if (!project || index === undefined) {
    return res.status(400).json({ error: 'Project name and stash index are required' });
  }

  try {
    const projectPath = await getActualProjectPath(project);
    await validateGitRepository(projectPath);

    // Apply stash
    const { stdout } = await execAsync(`git stash apply stash@{${index}}`, { cwd: projectPath });
    
    res.json({ success: true, output: stdout || 'Stash applied successfully' });
  } catch (error) {
    console.error('Git stash apply error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Pop a stash (apply and remove)
router.post('/stash/:index/pop', async (req, res) => {
  const { project } = req.body;
  const { index } = req.params;
  
  if (!project || index === undefined) {
    return res.status(400).json({ error: 'Project name and stash index are required' });
  }

  try {
    const projectPath = await getActualProjectPath(project);
    await validateGitRepository(projectPath);

    // Pop stash
    const { stdout } = await execAsync(`git stash pop stash@{${index}}`, { cwd: projectPath });
    
    res.json({ success: true, output: stdout || 'Stash popped successfully' });
  } catch (error) {
    console.error('Git stash pop error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a stash
router.delete('/stash/:index', async (req, res) => {
  const { project } = req.body;
  const { index } = req.params;
  
  if (!project || index === undefined) {
    return res.status(400).json({ error: 'Project name and stash index are required' });
  }

  try {
    const projectPath = await getActualProjectPath(project);
    await validateGitRepository(projectPath);

    // Drop stash
    const { stdout } = await execAsync(`git stash drop stash@{${index}}`, { cwd: projectPath });
    
    res.json({ success: true, output: stdout || 'Stash deleted successfully' });
  } catch (error) {
    console.error('Git stash drop error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Show stash content
router.get('/stash/:index/show', async (req, res) => {
  const { project } = req.query;
  const { index } = req.params;
  
  if (!project || index === undefined) {
    return res.status(400).json({ error: 'Project name and stash index are required' });
  }

  try {
    const projectPath = await getActualProjectPath(project);
    await validateGitRepository(projectPath);

    // Show stash content
    const { stdout } = await execAsync(`git stash show -p stash@{${index}}`, { cwd: projectPath });
    
    res.json({ success: true, diff: stdout });
  } catch (error) {
    console.error('Git stash show error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== TAG MANAGEMENT ====================

// Get list of tags
router.get('/tags', async (req, res) => {
  const { project } = req.query;
  
  if (!project) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  try {
    const projectPath = await getActualProjectPath(project);
    await validateGitRepository(projectPath);

    // Get tags with details
    const { stdout } = await execAsync('git tag -l --sort=-version:refname --format="%(refname:short)|%(objectname:short)|%(creatordate:relative)|%(subject)"', { cwd: projectPath });
    
    const tags = stdout
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [name, hash, date, message] = line.split('|');
        return {
          name,
          hash,
          date,
          message: message || ''
        };
      });

    res.json({ success: true, tags });
  } catch (error) {
    console.error('Git tags list error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new tag
router.post('/tags', async (req, res) => {
  const { project, name, message, commit = 'HEAD' } = req.body;
  
  if (!project || !name) {
    return res.status(400).json({ error: 'Project name and tag name are required' });
  }

  try {
    const projectPath = await getActualProjectPath(project);
    await validateGitRepository(projectPath);

    // Create tag
    let command = `git tag "${name}" ${commit}`;
    if (message) {
      command = `git tag -a "${name}" -m "${message.replace(/"/g, '\\"')}" ${commit}`;
    }
    
    const { stdout } = await execAsync(command, { cwd: projectPath });
    
    res.json({ success: true, output: stdout || `Tag ${name} created successfully` });
  } catch (error) {
    console.error('Git tag create error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a tag
router.delete('/tags/:tagName', async (req, res) => {
  const { project } = req.body;
  const { tagName } = req.params;
  
  if (!project || !tagName) {
    return res.status(400).json({ error: 'Project name and tag name are required' });
  }

  try {
    const projectPath = await getActualProjectPath(project);
    await validateGitRepository(projectPath);

    // Delete tag
    const { stdout } = await execAsync(`git tag -d "${tagName}"`, { cwd: projectPath });
    
    res.json({ success: true, output: stdout || `Tag ${tagName} deleted successfully` });
  } catch (error) {
    console.error('Git tag delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Push tag to remote
router.post('/tags/:tagName/push', async (req, res) => {
  const { project, remote = 'origin' } = req.body;
  const { tagName } = req.params;
  
  if (!project || !tagName) {
    return res.status(400).json({ error: 'Project name and tag name are required' });
  }

  try {
    const projectPath = await getActualProjectPath(project);
    await validateGitRepository(projectPath);

    // Push tag
    const { stdout } = await execAsync(`git push ${remote} "${tagName}"`, { cwd: projectPath });
    
    res.json({ success: true, output: stdout || `Tag ${tagName} pushed to ${remote} successfully` });
  } catch (error) {
    console.error('Git tag push error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== CHERRY-PICK AND REBASE ====================

// Cherry-pick a commit
router.post('/cherry-pick', async (req, res) => {
  const { project, commit } = req.body;
  
  if (!project || !commit) {
    return res.status(400).json({ error: 'Project name and commit hash are required' });
  }

  try {
    const projectPath = await getActualProjectPath(project);
    await validateGitRepository(projectPath);

    // Cherry-pick commit
    const { stdout } = await execAsync(`git cherry-pick "${commit}"`, { cwd: projectPath });
    
    res.json({ success: true, output: stdout || 'Cherry-pick completed successfully' });
  } catch (error) {
    console.error('Git cherry-pick error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Interactive rebase
router.post('/rebase', async (req, res) => {
  const { project, onto, interactive = false } = req.body;
  
  if (!project || !onto) {
    return res.status(400).json({ error: 'Project name and target branch/commit are required' });
  }

  try {
    const projectPath = await getActualProjectPath(project);
    await validateGitRepository(projectPath);

    // Start rebase
    const interactiveFlag = interactive ? '-i' : '';
    const { stdout } = await execAsync(`git rebase ${interactiveFlag} "${onto}"`, { cwd: projectPath });
    
    res.json({ success: true, output: stdout || 'Rebase completed successfully' });
  } catch (error) {
    console.error('Git rebase error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Continue rebase after resolving conflicts
router.post('/rebase/continue', async (req, res) => {
  const { project } = req.body;
  
  if (!project) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  try {
    const projectPath = await getActualProjectPath(project);
    await validateGitRepository(projectPath);

    // Continue rebase
    const { stdout } = await execAsync('git rebase --continue', { cwd: projectPath });
    
    res.json({ success: true, output: stdout || 'Rebase continued successfully' });
  } catch (error) {
    console.error('Git rebase continue error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Abort rebase
router.post('/rebase/abort', async (req, res) => {
  const { project } = req.body;
  
  if (!project) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  try {
    const projectPath = await getActualProjectPath(project);
    await validateGitRepository(projectPath);

    // Abort rebase
    const { stdout } = await execAsync('git rebase --abort', { cwd: projectPath });
    
    res.json({ success: true, output: stdout || 'Rebase aborted successfully' });
  } catch (error) {
    console.error('Git rebase abort error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;