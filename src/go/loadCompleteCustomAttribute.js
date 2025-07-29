import {customAttribute, inject} from 'aurelia-framework';

@customAttribute('loadcomplete')
@inject(Element)
export class LoadCompleteCustomAttribute {

  constructor(element){
    this.element = element;
  }

  bind(bindingContext, overridingContext) {
    bindingContext.element = this.element;
    bindingContext.load_complete_callback(this.element);
  }
}
