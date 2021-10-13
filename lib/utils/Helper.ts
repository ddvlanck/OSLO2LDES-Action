import { appendFileSync } from 'fs';
import type * as RDF from '@rdfjs/types';
import * as N3 from 'n3';
import { DataFactory } from 'rdf-data-factory';

export class Helper {
  private readonly baseUri = 'https://github.com/informatievlaanderen/OSLO-Generated/blob/production/report';
  private readonly factory = new DataFactory();

  public writeQuadsToFile = (quads: RDF.Quad[], file: string): Promise<void> => {
    const writer = new N3.Writer();
    writer.addQuads(quads);

    return new Promise<void>((resolve, reject) => {
      writer.end((error: any, result: any) => {
        if (error) {
          reject(new Error(error.stack));
        }

        appendFileSync(file, result);
        resolve();
      });
    });
  };

  public generateReportUrl = (specification: any): string[] => {
    const name = specification.name;

    if (specification.urlref.includes('/standaard/')) {
      const urlRef = specification.urlref;
      const next = specification.navigation.next;
      const urlRefDate = urlRef.slice(Number.parseInt(urlRef.lastIndexOf('/'), 10) + 1);
      const nextWithoutDate = next.slice(0, Math.max(0, next.lastIndexOf('/')));

      return [`${this.baseUri}${next}/all-${name}.jsonld?raw=true`, `${this.baseUri}${nextWithoutDate}/${urlRefDate}/all-${name}.jsonld?raw=true`];
    }
    return [`${this.baseUri}${specification.urlref}/all-${name}.jsonld?raw=true`];
  };

  public createQuadWithObjectNode = (
    subject: string | RDF.BlankNode,
    predicate: string,
    object: string | RDF.BlankNode,
    graph?: string,
  ): RDF.Quad =>
    this.factory.quad(
      typeof subject === 'string' ? this.factory.namedNode(subject) : subject,
      this.factory.namedNode(predicate),
      typeof object === 'string' ? this.factory.namedNode(object) : object,
      graph ? this.factory.namedNode(graph) : undefined,
    );

  public createQuadWithObjectLiteral = (
    subject: string,
    predicate: string,
    object: string,
    language: string,
    graph: string,
  ): RDF.Quad =>
    this.factory.quad(
      this.factory.namedNode(subject),
      this.factory.namedNode(predicate),
      this.factory.literal(object, language),
      this.factory.namedNode(graph),
    );

  public createBlankNode = (): RDF.BlankNode => this.factory.blankNode();
}

export const helper = new Helper();
