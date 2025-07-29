/**
 * Created by montymccune on 7/26/19.
 */

import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';
import {Data} from '../data/go/data';
import { isInteger } from 'lodash';
//import {PopupHelper} from './popupHelper';


class Dx{
  constructor(id, code, desc, data, bodypart){
    this.id = id;
    this.selected = false;
    this.code = code;
    this.description = desc;
    this.data = data;
    this.side=null;
    this.part=bodypart;
  }
}


@inject(DialogController, http, helper, Data)//,PopupHelper)
export class DxSearch {

  popupTop=0;
  popupLeft=0;
  popupWidth = 0;
  popupHeight = 0;


  searchResults=[];
  searchString="";
  bodypart=null;
  bodyside=null;
  sortByUsage=true;
  distinct=true;
  popupHelper=null;

  spinnerLeft=0;
  spinnerTop=0;
  displaySpinner = false;

  selectedDiagnosis=[]

  searchResultsHeight;
  resizeSearchTimeout;

  initialDiagnosis=[];

  bodyparts=[];// = ['Ankle','Foot', 'Knee', 'Hip', 'Wrist','Hand', 'Elbow', 'Shoulder', 'Cervical','Thoracic', 'Lumbar'];
  //selectedBodypart=null;
  //displayPhoneInputButton=false;

  searchFilters=[];

  constructor(DialogController, http, helper, Data){//, PopupHelper){
    this.dialogController = DialogController;
    this.http = http;
    this.helper = helper;
    this.goData = Data;
    //this.popupHelper = PopupHelper;
  }

  close(){
    let self = this;
    self.dialogController.close(true, self.selectedDiagnosis);
  }

  cancel(){
    let self = this;
    self.dialogController.cancel();
  }

  addSearchFilter(filter){
    var index = _.findIndex(this.searchFilters, function(f){return f == filter});
    if(index == -1){
      //add filter...
      this.searchFilters.push(filter);
    }
  }

  removeSearchFilter(index){
      this.searchFilters.splice(index, 1);
  }

  activate(obj){
    let self = this;

    //self.bodyparts = self.goData.bodyparts;
    //self.bodyparts.push("All");
    for(var i = 0; i < self.goData.bodyparts.length; i++){
      self.bodyparts.push(self.goData.bodyparts[i]);
    }



    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    self.popupWidth = windowWidth* .8;
    self.popupHeight = (windowHeight - 75) * .8;
    self.popupTop = (windowHeight - self.popupHeight) / 2;
    self.popupLeft = (windowWidth - self.popupWidth) / 2;


    self.spinnerLeft = (self.popupWidth / 2) - 21;
    self.spinnerTop = (self.popupHeight / 2)-21;

    self.popupHelper = obj.popupHelper;

    var specifyCode = false;

    if(obj.options){
      if(obj.options.hasOwnProperty('width')){
        self.popupWidth = obj.options.width;
      }
      if(obj.options.hasOwnProperty('height')){
        self.popupHeight = obj.options.height;
      }
      if(obj.options.hasOwnProperty('top')){
        self.popupTop = obj.options.top;
      }
      if(obj.options.hasOwnProperty('left')){
        self.popupLeft = obj.options.left;
      }
      if(obj.options.hasOwnProperty('searchString')){
        self.searchString = obj.options.searchString;
      }else if(obj.options.hasOwnProperty("initialDiagnosis")){
        self.initialDiagnosis = obj.options.initialDiagnosis;
      }
      if(obj.options.hasOwnProperty('specifyCode')){
        specifyCode = obj.options.specifyCode;
      }
    }

    self.bodypart = obj.bodypart;
    if(self.bodypart != undefined  && self.bodypart != null){
      self.searchFilters.push(self.bodypart);
    }
 

    self.bodyside = obj.bodyside;

    if(self.initialDiagnosis.length > 0){
      //setup initial dxs...
      self.populateInitialDiagnosis();
    }else{
      //auto-search by usage, distinct by code
      if(self.searchString.length == 0){
        self.search();
      }else{
        if(!specifyCode){
          self.seachIcd10();
        }else{
          self.openChildPopup(self.searchString, "NONE");
        }
      }
    }

  }

  populateInitialDiagnosis(){
    let self = this;
    for(var i = 0; i < self.initialDiagnosis.length; i++){
      self.searchResults.push(new Dx(0, self.initialDiagnosis[i].PatientDxCode, 
        self.initialDiagnosis[i].PatientDxDescription, 
        self.initialDiagnosis[i], self.bodypart));
    }
  }

  attached(){
    var res = $(this.dxpop).closest('ux-dialog-container');
    var uxDx = res[0];
    uxDx.style.setProperty("z-index", "5001", "important");

    var style={
      'z-index': 5001
    }

    $('ux-dialog-overlay').css(style);

    this.resizeSearchResults();
  }

  resizeSearchResults(){
    let self = this;
    this.resizeSearchTimeout = setTimeout(self.resizeSearchResultsCallback.bind(self), 50);
  }

  resizeSearchResultsCallback(){
    let self = this
    clearTimeout(self.resizeSearchTimeout)
    //adjust search bar height...
    var selectedPxHeight = $('#selectedDiagnosis').height();
    selectedPxHeight = selectedPxHeight == undefined ? 0 : selectedPxHeight;
    self.searchResultsHeight = self.popupHeight - 198 - selectedPxHeight;
  }

  searchClicked(){
    this.seachIcd10();
  }

  removeDiagnosisClick(t){
    let self = this;
    for(let i = 0; i < self.selectedDiagnosis.length; i++){
      if(self.selectedDiagnosis[i].code == t.code){
        self.selectedDiagnosis.splice(i, 1)
      }
    }
    self.resizeSearchResults();
  }

  checkForSideSelection(px){

    let part = null;

    if(px.data.hasOwnProperty("Body_Part")){
      if(px.data.Body_part == null){
        return false;
      }
      part = px.data.Body_Part.toUpperCase();
    }

    if(px.data.hasOwnProperty("Region")){
      if(px.data.Region == null){
        return false;
      }
      part = px.data.Region.toUpperCase();
    }

    if(part == 'ANKLE' || part == 'KNEE' || part == 'HIP' ||
      part == 'HAND' || part == 'WRIST' || part == 'SHOULDER' ||
      part == 'FOOT' || part == 'ELBOW'){
        return true;
      }
      return false;
  }

  tryBodysidePicker(showPicker, callback){
    let self = this;
    if(showPicker){
      self.popupHelper.openBodysidePickerPop(function(side){
        callback(side);
      });
    }else{
      callback(null);
    }
  }

  checkSelectedDiagnosisForExisting(px){
    return _.find(this.selectedDiagnosis, function(p){return p.code == px.code});
  }

  addClicked(r){
    let self = this;

    if(r.data.Child_Count > 0){
      self.popupHelper.openBodysidePickerPop(function(side){
        self.openChildPopup(r.code, side);
      });
    }else{
      var displaySideSelection = self.checkForSideSelection(r);
      self.tryBodysidePicker(displaySideSelection, function(side){
  
        var dxToAdd = r;
  
        //does this diagnosis exist???
        var foundDx = self.checkSelectedDiagnosisForExisting(dxToAdd);
        if(foundDx){
          //create new dx...
          dxToAdd = new Dx(r.id, r.code, r.description, r.data, self.bodypart);
        }
  
        if(side != null){
          dxToAdd.side = side;
        }
  
  
        self.selectedDiagnosis.push(dxToAdd)
        self.resizeSearchResults();
      });
    }
  }

  resizeSearchResults(){
    let self = this;
    this.resizeSearchTimeout = setTimeout(self.resizeSearchResultsCallback.bind(self), 50);
  }

  resizeSearchResultsCallback(){
    let self = this
    clearTimeout(self.resizeSearchTimeout)
    //adjust search bar height...
    var selectedPxHeight = $('#selectedDiagnosis').height();
    selectedPxHeight = selectedPxHeight == undefined ? 0 : selectedPxHeight;
    self.searchResultsHeight = self.popupHeight - 198 - selectedPxHeight;
  }

  search(){
    var self = this;
    self.searchResults=[];
    self.displaySpinner = true;
    //(string query, bool icd10, string bodypart, bool sortByUsage, bool distinct)
    let url = 'Diagnosis/search?query='+this.searchString+"&icd10=true&bodypart="+self.bodypart+"&sortByUsage="+self.sortByUsage+"&distinct="+self.distinct;
    self.goData.getWithUrl(url, function(res){
      for(var i = 0; i < res.length; i++){
        var dx = res[i];
        self.searchResults.push(new Dx(dx.Id, dx.Icd10Code, dx.Description, dx, self.bodypart))
      }
      self.displaySpinner = false;
    });
  }

  seachIcd10(){
    let self = this;
    self.searchResults=[];
    self.displaySpinner = true;

    //let finalSearch = self.bodypart == "All" ? self.searchString : self.bodypart + " " + self.searchString;
    let finalSearch = "";
    for(var i = 0; i < self.searchFilters.length; i++){
      finalSearch += self.searchFilters[i] + " ";
    }

    finalSearch += self.searchString;

    var url = 'icd10codes/search?pageSize=100&pageNumber=1&searchTerm=' + finalSearch;
    self.goData.getWithUrl(url, function(res){
      if(res.ICD10Codes != null){
        for(var i = 0; i < res.ICD10Codes.length; i++){
          var dx = res.ICD10Codes[i];
          self.searchResults.push(new Dx(dx.Code, dx.Code, dx.Descriptor, dx, self.bodypart))
        }
      }
      self.displaySpinner = false;
    });
  }

  getCodeWithLaterality(code, laterality, callback){
    let self = this;
    let url = `icd10data?icd10code=${code}&laterality=${laterality}`;
    self.goData.getWithUrl(url, function(res){
      callback(res);
    });
  }


  openChildPopup(code, laterality){
    let self =this;
    self.getCodeWithLaterality(code, laterality, function(res){

      if(res.Children.length > 0){
        let columnHeaders=['Code','Description'];
        let rowData = [];
        for(let i = 0; i < res.Children.length; i++){
          let code= res.Children[i];
          let genTableRow = self.goData.getGenericTableRow([code.Code, code.Descriptor], code);
          genTableRow.id = i;
          rowData.push(genTableRow);
        }

        self.popupHelper.openGenericTablePop('Select Child Code', columnHeaders, rowData, false, {zIndex: 5001}, function(res){
          //return selected child here...
          //get laterality from code...
          let side = self.goData.lateralityFromIcd10Code(res.row.data.Code);
          let dx = new Dx(res.row.data.Code, res.row.data.Code, res.row.data.Descriptor, res.row.data, self.bodypart);
          dx.childCode = true;
          dx.side = side;
          self.selectedDiagnosis.push(dx);
          self.popupHelper.activeController.close();
          //self.close();
        });

      }else{
          //???ICD0Code.Code.Descriptor
        let dx = new Dx(0, res.ICD10Code.Code, res.ICD10Code.Descriptor, res.ICD10Code, self.bodypart);
        dx.side = laterality;
        self.selectedDiagnosis.push(dx);
        //self.close(true, self.selectedDiagnosis);
        return;
      }
    });
  }



}
