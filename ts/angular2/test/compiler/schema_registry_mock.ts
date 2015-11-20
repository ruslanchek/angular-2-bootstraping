import {ElementSchemaRegistry} from 'angular2/src/compiler/schema/element_schema_registry';
import {isPresent} from 'angular2/src/facade/lang';

export class MockSchemaRegistry implements ElementSchemaRegistry {
  constructor(public existingProperties: {[key: string]: boolean},
              public attrPropMapping: {[key: string]: string}) {}
  hasProperty(tagName: string, property: string): boolean {
    var result = this.existingProperties[property];
    return isPresent(result) ? result : true;
  }

  getMappedPropName(attrName: string): string {
    var result = this.attrPropMapping[attrName];
    return isPresent(result) ? result : attrName;
  }
}
