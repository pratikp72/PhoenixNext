import {helper} from '../../helpers/helper';
import {http} from '../../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import {DocumentPopup} from "../documentPopup";
import {DialogService} from 'aurelia-dialog';

@inject(helper,http, DialogService)
export class Document {

  data;

  constructor(helper, http, DialogService){
    this.helper = helper;
    this.http = http;
    this.dialogService = DialogService;
  }

  activate(model) {
    this.data = model;
  }

  openDocument(){
    this.displayDocumentPopup(this.data.data.DocPath);
  }

  displayDocumentPopup(url){
    let self = this;

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    self.dialogService.open({viewModel: DocumentPopup, model: {popupWidth: windowWidth, popupHeight: windowHeight, documentUrl: url}}).whenClosed(response => {

    });
  }

}
