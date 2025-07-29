import * as _ from 'lodash';


export class ParentChildPicker {

  parentChildItem=null;

  parentChildItems=[];


  currentItem=null;
  hasParent = false;
  selectedItem=null;
  listHeight=400;

  activate(model) {
    this.home = model.home;
    this.parent = model;
    this.parentChildItem = model.parentChildItem;
    this.parentChildItems = model.parentChildItems;
    this.currentItem = model.currentParentChildItem;
  }

  attached(){
    let self = this;
    if(self.currentItem == undefined || self.currentItem == null){
      self.currentItem = self.parentChildItems.length > 0 ? self.parentChildItems[0] : null;
    }

    //self.hasParent = true;
  }

  itemSelected(item){
    let self = this;
    self.parent.dialog.close(true, item);
  }

  backClick(){
    let self = this;

    if(self.selectedItem){
      self.selectedItem.selected = false;
    }

    if(self.currentItem.parent){
      self.currentItem = self.currentItem.parent;
    }
    self.hasParent = self.currentItem.parent ? true : false;
  }

  itemClick(item){
    let self = this;
    if(item.items.length > 0){
      self.currentItem = item;
      self.hasParent = self.currentItem.parent ? true : false;
    }else{
      if(self.selectedItem){
        self.selectedItem.selected = false;
      }
      item.selected = true;
      self.selectedItem = item;
    }
  }
}
