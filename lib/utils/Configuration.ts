import * as core from '@actions/core';

export default class Configuration {
  public url: string;
  public storage: string;
  public githubPagesUrl: string;
  public gitUsername: string;
  public gitEmail: string;
  public pageSize: number;

  public constructor() {
    this.url = core.getInput('url');
    this.storage = core.getInput('storage');
    this.githubPagesUrl = core.getInput('gh_pages_url');
    this.gitUsername = core.getInput('git_username');
    this.gitEmail = core.getInput('git_email');
    this.pageSize = Number.parseInt(core.getInput('page_size'), 10);
  }
}

export const configuration = new Configuration();
