import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import * as _ from 'lodash';
import moment from 'moment';
import {Data} from '../data/go/data';
import {Home} from './home';
import {CreateVisitPopup} from './createVisitPopup'
import {DialogService} from 'aurelia-dialog';
import {PopupHelper} from "./popupHelper";



@inject(helper,http, Data, Home, DialogService, PopupHelper)
export class MoveFolderView {

  popupHelper;

  parent;
  //zIndex=1000;
  // listHeight;// = 500;
  selectedFolder;
  folders=[];

  constructor(helper, http, Data, Home, DialogService, PopupHelper) {
    this.helper = helper;
    this.http = http;
    this.data = Data;
    this.home = Home;
    this.dialogService = DialogService;
    this.popupHelper = PopupHelper;
  }

  activate(model) {
    let self = this;
    self.parent = model;
    self.folders = model.rootFolder.folders;
  }

  folderClick(f){
    let self = this;
    self.parent.dialog.close(true, {folder: f});
  }

}
