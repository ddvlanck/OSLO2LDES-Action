import { existsSync, mkdirSync } from 'fs';
import { DataHandler } from './DataHandler';
import { configuration } from './utils/Configuration';
import { helper } from './utils/Helper';

const fetch = require('node-fetch');

export class Processor {
  private readonly url: string;
  private readonly specificationsToBeProcessed: any[];
  private readonly unhandledSpecifications: string[];
  private readonly dataHandler: DataHandler;

  public constructor(url: string, pageSize: number, outputDirPath: string) {
    this.url = url;
    this.specificationsToBeProcessed = [];
    this.unhandledSpecifications = [];
    this.dataHandler = new DataHandler();

    // Create necessary directories where data will be stored
    if (!existsSync(outputDirPath)) {
      mkdirSync(outputDirPath);
    }
  }

  public processConfigurationFile = async (): Promise<void> => {
    const response = await fetch(this.url);
    const data = await response.json();

    data.forEach((specification: any) => {
      const specificationUrl = specification.urlref;

      if (specificationUrl && this.mustBeProcessed(specificationUrl)) {
        this.specificationsToBeProcessed.push(specification);
      }

      // // Add this specific case (specifications rendered with toolchain v1)
      if (specificationUrl &&
        specificationUrl.includes('/applicatieprofiel') &&
        specificationUrl.includes('/standaard/')
      ) {
        const navigation = specification.navigation;

        if (navigation !== undefined && navigation !== null && Object.entries(navigation).length > 0) {
          this.specificationsToBeProcessed.push(specification);
        }
      }
    });
  };

  public processSpecifications = async (): Promise<void> => {
    const tasks: any[] = [];

    this.specificationsToBeProcessed.forEach(specification => {
      tasks.push(this.processSpecification(specification));
    });

    await Promise.all(tasks);

    this.unhandledSpecifications.forEach(specification => {
      helper.appendToFile(`${specification}\n`, `${configuration.storage}/.error.txt`);
    });
  };

  private readonly processSpecification = async (specification: any): Promise<void> => {
    const reportUrls = helper.generateReportUrl(specification);
    const data = (await Promise.all([this.fetchSpecification(reportUrls)]))[0];

    if (!data) {
      console.error(`No valid URL found for ${specification.name}.`);
      this.unhandledSpecifications.push(specification.urlref);
      return;
    }

    await this.dataHandler.toLdes(data);
  };

  private readonly fetchSpecification = async (reportUrls: string[]): Promise<any> => {
    if (reportUrls.length === 0) {
      return;
    }

    const url = reportUrls.pop();
    const response = await fetch(url);

    if (!response.ok) {
      return await this.fetchSpecification(reportUrls);
    }

    return await response.json();
  };

  private readonly mustBeProcessed = (url: string): boolean =>
    url.includes('/applicatieprofiel/') && url.includes('/erkendestandaard/');
}
