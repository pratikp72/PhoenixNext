import {customAttribute, inject} from 'aurelia-framework';

@customAttribute('examrow')
@inject(Element)
export class ExamRowCustomAttribute {

  constructor(element){
    this.element = element;
  }

  bind(bindingContext, overridingContext) {
    bindingContext.element = this.element;
    bindingContext.auto_grow(this.element);
  }
}
