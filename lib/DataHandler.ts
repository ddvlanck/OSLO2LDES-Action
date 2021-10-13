import type * as RDF from '@rdfjs/types';
import { configuration } from './utils/Configuration';
import { helper } from './utils/Helper';

export class DataHandler {
  private pageNumber: number;
  public outputDirPath: string;
  public ldesBaseUri: string;

  public constructor() {
    this.pageNumber = 1;
    this.outputDirPath = configuration.storage;
    this.ldesBaseUri = configuration.githubPagesUrl.includes('https://') ?
      `${configuration.githubPagesUrl}/${configuration.storage}` :
      `https://${configuration.githubPagesUrl}/${configuration.storage}`;
  }

  public toLdes = async (data: any): Promise<void> => {
    const context = data['@id'];
    const publicationDate = data['publication-date'];

    const members: string[] = [];

    const classQuads = this.classesToQuads(data.classes, context, publicationDate, members);
    const propertyQuads = this.propertiesToQuads(data.properties, context, publicationDate, members);
    const externalClassQuads = this.classesToQuads(data.externals, context, publicationDate, members);
    const externalPropertyQuads = this.propertiesToQuads(data.externalproperties, context, publicationDate, members);

    const quads = [...classQuads, ...propertyQuads, ...externalClassQuads, ...externalPropertyQuads];
    await helper.writeQuadsToFile(quads, `${this.outputDirPath}/${this.pageNumber}.trig`);

    const metadata: RDF.Quad[] = [];
    members.forEach(member =>
      metadata.push(
        helper.createQuadWithObjectNode(
          this.ldesBaseUri,
          'https://w3id.org/tree#member',
          member,
        ),
      ));

    metadata.push(
      helper.createQuadWithObjectNode(
        this.ldesBaseUri,
        'https://w3id.org/tree#view',
        `${this.ldesBaseUri}/${this.pageNumber}.trig`,
      ),
    );

    await helper.writeQuadsToFile(metadata, `${this.outputDirPath}/${this.pageNumber}.trig`);

    // Below we add a relation to this page, which we append to the previous page.
    // Since we don't know what the last page will be, we have to solve it like this.
    // This way we avoid adding a relation to a next page, that doesn't exist, on the last page
    if (this.pageNumber > 1) {
      const controls: RDF.Quad[] = [];
      const blankNode = helper.createBlankNode();

      controls.push(
        helper.createQuadWithObjectNode(
          `${this.ldesBaseUri}/${this.pageNumber - 1}.trig`,
          'https://w3id.org/tree#relation',
          blankNode,
        ),
        helper.createQuadWithObjectNode(
          blankNode,
          'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
          'https://w3id.org/tree#Relation',
        ),
        helper.createQuadWithObjectNode(
          blankNode,
          'https://w3id.org/tree#node',
          `${this.ldesBaseUri}/${this.pageNumber}.trig`,
        ),
      );

      await helper.writeQuadsToFile(controls, `${this.outputDirPath}/${this.pageNumber - 1}.trig`);
    }

    this.pageNumber++;
  };

  private readonly classesToQuads = (
    classes: any[],
    specificationId: string,
    publicationDate: string,
    members: string[],
  ): RDF.Quad[] => {
    const quads: RDF.Quad[] = [];

    if (!classes) {
      console.log(`No classes for ${specificationId}`);
      return quads;
    }

    for (const classObject of classes) {
      const id = classObject['@id'];
      const versionId = `${id}@${publicationDate}`;
      const type = classObject['@type'];

      // Process these as a container with language tags as keys
      const definitionObject = classObject.definition || {};
      const labelObject = classObject.label || undefined;

      // Classes that do not have a label will not be processed.
      // At the moment, this means that codelists (http://www.w3.org/2004/02/skos/core#Concept)
      // are not being processed.
      if (labelObject === '' || labelObject === undefined) {
        continue;
      }

      members.push(versionId);

      quads.push(
        helper.createQuadWithObjectNode(
          versionId,
          'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
          type,
          specificationId,
        ),
        helper.createQuadWithObjectNode(
          versionId,
          'http://purl.org/dc/terms/isVersionOf',
          id,
          specificationId,
        ),
      );

      Object.keys(definitionObject).forEach((language: string) => {
        const definition = definitionObject[language];

        quads.push(
          helper.createQuadWithObjectLiteral(
            versionId,
            'http://www.w3.org/2000/01/rdf-schema#comment',
            definition,
            language,
            specificationId,
          ),
        );
      });

      Object.keys(labelObject).forEach((language: string) => {
        const definition = labelObject[language];

        quads.push(
          helper.createQuadWithObjectLiteral(
            versionId,
            'http://www.w3.org/2000/01/rdf-schema#label',
            definition,
            language,
            specificationId,
          ),
        );
      });

      if (classObject.extra['EA-Parents2']) {
        const parents = Array.isArray(classObject.extra['EA-Parents2']) ?
          classObject.extra['EA-Parents2'] :
          [classObject.extra['EA-Parents2']];

        parents.forEach((parent: any) => {
          quads.push(
            helper.createQuadWithObjectNode(
              versionId,
              'http://www.w3.org/2000/01/rdf-schema#subclassOf',
              parent.uri,
              specificationId,
            ),
          );
        });
      }
    }

    return quads;
  };

  private readonly propertiesToQuads = (
    propertyObjects: any[],
    specificationId: string,
    publicationDate: string,
    members: string[],
  ): RDF.Quad[] => {
    const quads: RDF.Quad[] = [];

    if (!propertyObjects) {
      console.log(`No properties for ${specificationId}`);
      return quads;
    }

    for (const propertyObject of propertyObjects) {
      const id = propertyObject['@id'];
      const versionId = `${id}@${publicationDate}`;
      const type = propertyObject['@type'];

      // Process these as a container with language tags as keys
      const definitionObject: any = propertyObject.definition || {};
      const labelObject: any = propertyObject.label || undefined;
      const domains: any[] = propertyObject.domain || [];

      // Properties that do not have a label will not be processed.
      // At the moment, this means that codelists (http://www.w3.org/2004/02/skos/core#Concept)
      // are not being processed.
      if (labelObject === '' || labelObject === undefined) {
        continue;
      }

      members.push(versionId);

      quads.push(
        helper.createQuadWithObjectNode(
          versionId,
          'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
          type,
          specificationId,
        ),
        helper.createQuadWithObjectNode(
          versionId,
          'http://purl.org/dc/terms/isVersionOf',
          id,
          specificationId,
        ),
      );

      Object.keys(definitionObject).forEach((language: string) => {
        const definition = definitionObject[language];

        quads.push(
          helper.createQuadWithObjectLiteral(
            versionId,
            'http://www.w3.org/2000/01/rdf-schema#comment',
            definition,
            language,
            specificationId,
          ),
        );
      });

      Object.keys(labelObject).forEach((language: string) => {
        const definition = labelObject[language];

        quads.push(
          helper.createQuadWithObjectLiteral(
            versionId,
            'http://www.w3.org/2000/01/rdf-schema#label',
            definition,
            language,
            specificationId,
          ),
        );
      });

      domains.forEach((domain: any) => {
        quads.push(
          helper.createQuadWithObjectNode(
            versionId,
            'http://www.w3.org/2000/01/rdf-schema#domain',
            domain.uri,
            specificationId,
          ),
        );
      });
    }

    return quads;
  };
}
