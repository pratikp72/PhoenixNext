import {inject, bindable} from 'aurelia-framework';
import {Editor} from '../editor'
  
@inject(Editor)
export class ToolbarExtraElement {

  //@bindable targetElementId;
  //@bindable dndId;
  @bindable item;

  cloneDisabled=false;
  requiredDisabled=false;
  anchorLeftDisabled=false;
  anchorRightDisabled=false;

  constructor(Editor) {
    this.editor = Editor;
  }

  update(){

    this.cloneDisabled = false;
    this.requiredDisabled=false;
    this.anchorLeftDisabled=false;
    this.anchorRightDisabled=false;

    if(this.item && this.item.table && this.item.toolType != 'MYTABLE'){
      //if this item is in a table,
      //disable clone...
      this.cloneDisabled = true;
      this.anchorLeftDisabled=true;
      this.anchorRightDisabled=true;
    }
  }

  // attached(e){
  //   var t = e;
  // }

  // anchorLeftClick(){
  //   var self = this;
  //   var itm = self.editor.getItem();
  //   self.editor.anchorItem(itm.id, 'left', function(i){
  //     self.item.anchorLeft = i.anchorLeft;
  //   });
  // }

  // anchorRightClick(){
  //   var self = this;
  //   var itm = self.editor.getItem();
  //   self.editor.anchorItem(itm.id, 'right', function(i){
  //     self.item.anchorRight = i.anchorRight;
  //   });
  // }

  required(){
    var itm = this.editor.getItem();
    this.editor.itemRequired(itm.id);
  }

  clone(e){

    //if selectedItem is TABLE, clone it else...
    if(this.editor.selectedItem.toolType=='MYTABLE'){
      this.editor.cloneItem(this.editor.selectedItem.id);
    }else{
      //check for marquee selected items...
      var contVm = this.editor.getContainerViewModel();
      var selections = contVm.selections;
      if(selections.length > 0){
        //clone each item...
        for(var i = 0 ; i < selections.length; i++){
          this.editor.cloneItem(selections[i].id);
        }
      }else{
        var itm = this.editor.getItem();
        this.editor.cloneItem(itm.id);
      }
    }

    e.stopPropagation();
  }

  delete(){
    // var itm = this.editor.getItem();
    // this.editor.deleteItem(itm.id);

    //check for marquee selected items...
    var contVm = this.editor.getContainerViewModel();
    var selections = contVm.selections;
    if(selections.length > 0){
      //delete each item...
      for(var i = 0 ; i < selections.length; i++){
        this.editor.deleteItem(selections[i]);
      }
    }else{
      var itm = this.editor.getItem();
      this.editor.deleteItem(itm);
    }
  }
}
