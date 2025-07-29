/**
 * Created by montymccune on 7/26/19.
 */

import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';


class Pat{
  constructor(id, name){
    this.id = id;
    this.name = name;
    this.selected = false;
  }
}


@inject(DialogController, http, helper)
export class PatientSearch {


  selectedPatient=null;
  searchResults=[];
  searchString="";

  popupLR = 0;
  popupTB = 0;
  popupWidth = 0;
  popupHeight = 0;


  constructor(DialogController, http, helper){
    this.dialogController = DialogController;
    this.http = http;
    this.helper = helper;
  }

  close(){
    let self = this;
    self.dialogController.close(true, self.selectedPatient);
  }

  cancel(){
    let self = this;
    self.dialogController.cancel();
  }

  activate(obj){
    let self = this;
    //auto-search by usage, distinct by code
    //self.search();

    self.popupWidth = obj.popupWidth * .8;
    self.popupHeight = (obj.popupHeight - 75) * .8;
    self.popupTop = (obj.popupHeight - self.popupHeight) / 2;
    self.popupLeft = (obj.popupWidth - self.popupWidth) / 2;
  }

  searchClicked(){

    this.search();
  }

  search(){
    var self = this;

    var n = self.helper.createNoty("searching...", 10000);
    n.show();

    self.searchResults=[];
    var url = 'patients/search?search='+self.searchString;
    self.http.get(self.helper.getApiUrl(url), function (res) {
      for(var i = 0; i < res.length; i++){
        var aPat = res[i];
        var lastFirst = aPat.NameLast + ", " + aPat.NameFirst;
        self.searchResults.push(new Pat(aPat.PatientID, lastFirst));
      }

      self.helper.notySuccess(n, "search complete");
      n.close();

    });
  }

  rowClicked(r){
    this.selectedPatient = r;
    for(var i = 0; i < this.searchResults.length; i++){
      if(this.searchResults[i].id == r.id){
        this.searchResults[i].selected = true;
      }else{
        this.searchResults[i].selected = false;
      }
    }
  }

}
