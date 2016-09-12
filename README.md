# gtm-json-converter
This tool converts json GTM exports into xlsx or csv, and can be used to QA tags and triggers in your GTM account. 

Each row chains together variables that are associated within GTM, e.g. triggers that reside within a given tag.

**Variables parsed from the json:** 
* folder name
* tag name
* event category
* event action
* event label
* triggers

The UI allows you to select and download multiple files at once, but does not currently support separate naming for multiple files.

Feel free to submit feature requests or pull requests to help build out this tool.
