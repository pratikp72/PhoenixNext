import {customElement, bindable, ObserverLocator, inject} from 'aurelia-framework';

@customElement('my-checkbox')
@inject(ObserverLocator)
export class MyCheckbox {
  @bindable selected;
  @bindable value;
  @bindable editing=false;
  @bindable callback;

  constructor(ObserverLocator){
     this.observerLocator = ObserverLocator;
  }

  selectedChanged(newValue, oldValue) {
    let self = this;
    if(self.callback != undefined){
      self.callback({checked: newValue});
    }
  }
}
