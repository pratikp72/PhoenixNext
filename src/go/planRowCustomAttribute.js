import {customAttribute, inject} from 'aurelia-framework';

@customAttribute('planrow')
@inject(Element)
export class PlanRowCustomAttribute {

  constructor(element){
    this.element = element;
  }

  bind(bindingContext, overridingContext) {
    bindingContext.r.element = this.element;

    //bindingContext.r.auto_grow(this.element);

    if(overridingContext.$last === true){
      overridingContext.parentOverrideContext.bindingContext.loadComplete();
    }
  }
}
