import { Data } from '../../data/go/data';
import {inject} from 'aurelia-framework';

@inject(Data)
export class OrdersSidebarItem{
  item = null;
  forms=[];

  constructor(Data){
    this.data = Data;
  }
  
  activate(item){
    this.item= item;
    this.loadCustomForms();
  }

  loadCustomForms(){
    let self = this;
    //get userId from options...
    const uId = self.item.options.userId;
    const url = `goforms/notemenu?userId=${uId}`;
    self.data.getWithUrl(url, function(data){
      self.forms = data;
    }); 
  }
}
