import {customAttribute, inject} from 'aurelia-framework';

@customAttribute('scheduleprovider')
@inject(Element)
export class ScheduleProviderCustomAttribute {

  last = false;
  parent;

  constructor(element){

  }

  bind(bindingContext, overridingContext) {
    if(overridingContext.$last == true){
      this.last = true;
      this.parent = overridingContext.parentOverrideContext.bindingContext;
      // overridingContext.parentOverrideContext.bindingContext.completeScheduleDateChange();
    }
  }

  attached(){
    // if(this.last == true){
    //   this.parent.completeScheduleDateChange();
    // }
  }
}
