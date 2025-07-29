/**
 * Created by montymccune on 7/26/19.
 */

import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';
import { Globals } from './globals';
import * as _ from 'lodash';
import {Data} from '../data/go/data';


class Pat{
  constructor(id, name, data){
    this.id = id;
    this.name = name;
    this.selected = false;
    this.data = data;
  }
}


@inject(DialogController, http, helper, Globals, Data)
export class PatientSearch {


  selectedPatient=null;
  searchResults=[];
  searchString="";

  popupLR = 0;
  popupTB = 0;
  popupWidth = 0;
  popupHeight = 0;

  showCreatePatient=false;


  constructor(DialogController, http, helper, Globals, Data){
    this.dialogController = DialogController;
    this.http = http;
    this.helper = helper;
    this.globals = Globals;
    this.data = Data;
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
    self.popupWidth = obj.popupWidth * .8;
    self.popupHeight = (obj.popupHeight - 75) * .8;
    self.popupTop = (obj.popupHeight - self.popupHeight) / 2;
    self.popupLeft = (obj.popupWidth - self.popupWidth) / 2;
  }

  attached(){
    var self = this;
    var res = $(this.patientpop).closest('ux-dialog-container');
    var uxDx = res[0];
    uxDx.style.setProperty("z-index", "5002", "important");

    var style={
      'z-index': 5001
    }
    $('ux-dialog-overlay').css(style);
  }

  searchClicked(){
    this.search();
  }

  inputKeydown(e){
    if(e.key === 'Enter'){
      this.search();
    }
    return true;
  }

  selectAndClose(p){
    let self = this;
    self.dialogController.close(true, p);
  }

  search(){
    var self = this;
    self.showCreatePatient = false;//reset...

    var n = self.helper.createNoty("searching...", 10000);
    n.show();

    self.searchResults=[];
    var url = 'patients/search/delimited?searchDelimited='+self.searchString;
    self.http.get(self.helper.getApiUrl(url), function (res) {

      let sorted = _.orderBy(res, ['NameLast', 'NameFirst'], ['asc', 'asc']);

      for(var i = 0; i < sorted.length; i++){
        var aPat = sorted[i];
        var lastFirst = aPat.NameLast + ", " + aPat.NameFirst;
        self.searchResults.push(new Pat(aPat.PatientID, lastFirst, aPat));
      }

      if(self.searchResults.length == 0 && !self.globals.admin.HL7Enabled){
        //if we didnt find a patient AND HL7Enabled is FALSE (meaning, we aren't using OPS...), show create patient...
        self.showCreatePatient = true;
      }

      //self.helper.notySuccess(n, "search complete");
      //n.close();

      self.helper.updateNoty(n, "search complete", "success", 1000);

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

  createPatientClick(){
    this.dialogController.close(true, {"createPatient": true});
  }

}
