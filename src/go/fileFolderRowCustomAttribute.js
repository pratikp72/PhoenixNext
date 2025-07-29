import {customAttribute, inject} from 'aurelia-framework';

@customAttribute('filefolderrow')
@inject(Element)
export class FileFolderRowCustomAttribute {

  last = false;
  parent;

  constructor(element){

  }

  bind(bindingContext, overridingContext) {
    if(overridingContext.$last == true){
      this.last = true;
      this.parent = overridingContext.parentOverrideContext.parentOverrideContext.bindingContext;
    }
  }

  attached(){
    if(this.last == true){
      //this.parent.setFileFolderHeight();
    }
  }
}
