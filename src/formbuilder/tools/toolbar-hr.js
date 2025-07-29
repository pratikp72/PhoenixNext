import {inject, bindable} from 'aurelia-framework';
import {Editor} from '../editor'
  
@inject(Editor)
export class ToolbarHr {

  @bindable item;
  @bindable parentToolbar;

  lineSizes=[1, 2, 3, 4, 5];

  constructor(Editor) {
    this.editor = Editor;
  }

  lineSizeClicked(l){
    this.parentToolbar.hrLineSize = l;
    this.parentToolbar.updateHrLineStyle();
  }

  lineStyleClicked(style){
    this.parentToolbar.hrLineStyle = style;
    this.parentToolbar.updateHrLineStyle();
  }

  // required(){
  //   this.editor.itemRequired(this.item.id);
  // }

  // clone(e){
  //   this.editor.cloneItem(this.item.id);
  //   e.stopPropagation();
  // }

  // delete(){
  //   this.editor.deleteItem(this.item.id);
  // }
}
