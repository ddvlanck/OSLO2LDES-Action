# OSLO2LDES Action

This repository publishes the OSLO Knowledge Graph as a Linked Data Event Stream on GitHub Pages by using a GitHub Action.

## Usage

Create a `.github/workflows/data.yaml` file in a repository of your choice. You can name the `.yaml` file how you want.

```yaml
# trigger workflow:

on:
  # - on schedule, every sunday at midnight
  schedule:
    - cron: '0 0 * * 0'
  # - manually
  workflow_dispatch:

jobs:
  scheduled:
    runs-on: ubuntu-latest
    steps:
      # Check out the repository, so it can read the files inside it and do other operations
      - name: Check out repo
        uses: actions/checkout@v2
      # Fetch the dataset, write the data to json files and push the files to the repo
      - name: Fetch and write data
        uses: ddvlanck/OSLO2LDES-Action@main
        with:
          gh_pages_url: 'ddvlanck.github.io/Republish-LDES'
          url: 'https://github.com/Informatievlaanderen/Data.Vlaanderen.be/blob/production/config/publication.json?raw=true'
          storage: 'oslo-ldes-raw'
```

The action will perform the following tasks:
- It will read the configuration file provided by the .yaml file through the `url` parameter. For each configured specification in the configuration file, the action will test if the specification has a status `erkende-standaard`. Specifications with another status are ignored at this moment.
- For all specifications that passed the status check, their report is fetched and their classes and properties are extracted and transformed to RDF quads.
- All the quads are then written to a `.trig` file because each graph property is set on each quad.
- All files are committed and pushed to your repository
- Data is deployed on GitHub pages

## Inputs

### `url`

The URL of the OSLO specifications configuration file. This URL should always be set to `https://github.com/Informatievlaanderen/Data.Vlaanderen.be/blob/production/config/publication.json?raw=true`

### `storage`

Name of the output directory where the fetched data will be stored.

### `gh_pages_url`

The URL on which the data will be deployed. Default: `http(s)://<username>.github.io/<repository>` or `http(s)://<organization>.github.io/<repository>`

## What does an OSLO LDES member look like?

For this LDES, an LDES member is considered to be a term defined in the OSLO Knowledge Graph. The LDES member will have a version identifier consisting of the original URI and the data when the specification was rendered. Because it is possible that URIs are re-used within multiple specifications, but with slightly different definitions, all LDES members are included in the graph that is set to the specification URL. That ensures that terms in different specifications with the same URI can live independently of each other. 

Furthermore, there is only one difference between an `<http://www.w3.org/2002/07/owl#Class>`, `<http://www.w3.org/2002/07/owl#ObjectProperty>` and `<http://www.w3.org/2002/07/owl#DatatypeProperty>` and it is that the latter two have an extra triple `rdfs:domain` referring to the class to which they belong.

```trig
<https://data.vlaanderen.be/ns/mobiliteit/trips-en-aanbod> {
<https://data.vlaanderen.be/ns/mobiliteit/trips-en-aanbod#aankomstknoop@2020-04-23> a <http://www.w3.org/2002/07/owl#ObjectProperty>;
    <http://purl.org/dc/terms/isVersionOf> <https://data.vlaanderen.be/ns/mobiliteit/trips-en-aanbod#aankomstknoop>;
    <http://www.w3.org/2000/01/rdf-schema#comment> "Knoop waar het Routesegment eindigt."@nl;
    <http://www.w3.org/2000/01/rdf-schema#label> "aankomstknoop"@nl;
    <http://www.w3.org/2000/01/rdf-schema#domain> <https://data.vlaanderen.be/ns/mobiliteit/trips-en-aanbod#Routesegment>
}
```
