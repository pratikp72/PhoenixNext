/**
 * Created by montymccune on 7/26/19.
 */

import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';
import * as _ from "lodash";
import {Data} from '../data/go/data';


// class Px{
//   constructor(id, code, desc, data){
//     this.id = id;
//     this.selected = false;
//     this.code = code;
//     this.description = desc;
//     this.data = data;
//     this.modifier;
//   }
// }


@inject(DialogController, http, helper, Data)
export class PxSearch {


  P=null;
  searchResults=[];
  searchString="";

  modifiers=['NONE','95'];
  selectedModifier=null;

  popupLR = 0;
  popupTB = 0;
  popupWidth = 0;
  popupHeight = 0;


  constructor(DialogController, http, helper, Data){
    this.dialogController = DialogController;
    this.http = http;
    this.helper = helper;
    this.goData = Data;
  }

  close(){
    let self = this;
    self.dialogController.close(true, self.selectedPx);
  }

  cancel(){
    let self = this;
    self.dialogController.cancel();
  }

  activate(obj){
    let self = this;

    console.log('PXSEARCH SETTINGS', obj);

    self.popupWidth = obj.popupWidth * .8;
    self.popupHeight = (obj.popupHeight - 75) * .8;
    self.popupTop = (obj.popupHeight - self.popupHeight) / 2;
    self.popupLeft = (obj.popupWidth - self.popupWidth) / 2;

    console.log('WIDTH & HEIGHT', self.popupWidth, self.popupHeight);
    console.log('TOP & LEFT', self.popupTB, self.popupLR);

    this.search();
  }

  searchClicked(){
    this.search();
  }

  setSelectedModifier(px, mod){
    px.modifier = mod;
  }

  search(){
    var self = this;
    self.searchResults=[];
    var url = 'procedures/search?searchTerm='+this.searchString;
    self.http.get(self.helper.getApiUrl(url), function (res) {

      if(res != null && res.length > 0){
        var filteredRes = _.filter(res, (item) => {
          return item.Body_Part != null && item.Body_Part.toLowerCase() == 'all' && item.Type.toLowerCase() == 'visit';
        });

        for(var i = 0; i < filteredRes.length; i++){
          var r = filteredRes[i];
          self.searchResults.push(new self.goData.getNewPx(r.ProcedureID, r.CptKey, r.Description, r));
        }
      }
    });
  }

  rowClicked(r){
    this.selectedPx = r;
    for(var i = 0; i < this.searchResults.length; i++){
      if(this.searchResults[i].id == r.id){
        this.searchResults[i].selected = true;
      }else{
        this.searchResults[i].selected = false;
      }
    }
  }

}
