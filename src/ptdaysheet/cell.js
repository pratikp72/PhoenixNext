import {inject, customAttribute, DOM} from 'aurelia-framework';

@customAttribute('my-cell-attribute')
@inject(DOM.Element)
export class CellCustomAttribute {

  constructor(element) {
    this.element = element;
  }

  bind(bindingContext, overridingContext) {
    let activity = bindingContext.r;
    let dgHelper = overridingContext.parentOverrideContext.bindingContext.datagridHelper;
    let sTab = dgHelper.selectedGoal.selectedTab;


    let charWidth = 10;
    let txtWidth = 0;
    if(activity.description){
      txtWidth = charWidth * activity.description.length;
    } 
    if(txtWidth > sTab.activityColumnWidth){
      sTab.activityColumnWidth = txtWidth;
    }
  }
}
