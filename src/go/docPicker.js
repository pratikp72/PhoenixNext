import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import * as _ from 'lodash';
import moment from 'moment';
import {Data} from '../data/go/data';
import {Home} from './home';
import {DocumentPopup} from "./documentPopup";
import {DialogService} from 'aurelia-dialog';


@inject(helper,http, Data, Home,DialogService )
export class DocPicker {

  documents=[];

  constructor(helper, http, Data, Home,DialogService) {
    this.helper = helper;
    this.http = http;
    this.data = Data;
    this.home = Home;
    this.dialogService = DialogService;
  }

  activate(model){
    this.documents = model;
  }

  openDocument(doc){
    var self = this;
    var url = self.data.createDocumentUrl(doc.id);
    this.displayDocumentPopup(url);
    // this.displayDocumentPopup(doc.data.DocPath);
    this.home.togglePicker('documents');
  }

  displayDocumentPopup(url){
    let self = this;
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    self.dialogService.open({viewModel: DocumentPopup, model: {popupWidth: windowWidth, popupHeight: windowHeight, documentUrl: url}}).whenClosed(response => {

    });
  }



}
