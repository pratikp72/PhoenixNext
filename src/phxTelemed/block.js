import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject, bindable} from 'aurelia-framework';

@inject(helper,http)
export class Block {

  data;
  widthList =[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  constructor(helper, http){
    this.helper = helper;
    this.http = http;
  }

  activate(model) {
    this.data = model;
  }

  deleteBlock(){
    this.data.row.deleteBlock(this.data);
  }

  setWidth(width){
    this.data.width = width;
  }
}
