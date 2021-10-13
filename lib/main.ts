import { execSync } from 'child_process';
import { rmdirSync } from 'fs';
import * as core from '@actions/core';
import { exec } from '@actions/exec';
import { Processor } from './Processor';
import { configuration } from './utils/Configuration';

const run = async (): Promise<void> => {
  core.startGroup('Configure git user and email.');
  await exec('git', ['config', 'user.name', configuration.gitUsername]);
  await exec('git', ['config', 'user.email', `${configuration.gitEmail}`]);
  core.endGroup();

  // Delete output folder to have a clean start, no old data
  core.startGroup('Delete output folder');
  rmdirSync(configuration.storage, { recursive: true });
  core.endGroup();

  core.startGroup('Process the configuration file.');
  const processor = new Processor(configuration.url, configuration.pageSize, configuration.storage);
  await processor.processConfigurationFile();
  core.endGroup();

  core.startGroup('Process all specification files from configuration file.');
  await processor.processSpecifications();
  core.endGroup();

  core.startGroup('List all changed files.');
  const newUnstagedFiles = execSync(
    'git ls-files --others --exclude-standard',
  ).toString();
  const modifiedUnstagedFiles = execSync('git ls-files -m').toString();
  const editedFilenames = [
    ...newUnstagedFiles.split('\n'),
    ...modifiedUnstagedFiles.split('\n'),
  ].filter(Boolean);
  core.info('newUnstagedFiles');
  core.info(`${newUnstagedFiles}`);
  core.info('modifiedUnstagedFiles');
  core.info(`${modifiedUnstagedFiles}`);
  core.info('editedFilenames');
  core.info(JSON.stringify(editedFilenames));
  core.endGroup();

  core.startGroup('Calculating diffstat with previous run.');
  const editedFiles = [];
  for (const filename of editedFilenames) {
    core.debug(`git adding ${filename}…`);
    await exec('git', ['add', filename]);
    editedFiles.push({
      name: filename,
    });
  }
  core.endGroup();

  core.startGroup('Committing new data to repository.');
  const alreadyEditedFiles = JSON.parse(process.env.FILES || '[]');

  core.info('alreadyEditedFiles');
  core.info(JSON.stringify(alreadyEditedFiles.slice(0, 100)));

  core.info('editedFiles');
  core.info(JSON.stringify(editedFiles.slice(0, 100)));

  const files = [...alreadyEditedFiles.slice(0, 100), ...editedFiles.slice(0, 100)];
  core.exportVariable('FILES', files);
  core.info('process.env.FILES');
  core.info(JSON.stringify(process.env.FILES));

  core.endGroup();
};

run().catch(error => {
  core.setFailed(`Workflow failed! ${error.message}`);
});
