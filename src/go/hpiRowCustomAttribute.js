import {customAttribute, inject} from 'aurelia-framework';

@customAttribute('hpirow')
@inject(Element)
export class HpiRowCustomAttribute {

  constructor(element){
    this.element = element;
  }

  bind(bindingContext, overridingContext) {
    bindingContext.element = this.element;
    bindingContext.auto_grow(this.element);
  }
}
