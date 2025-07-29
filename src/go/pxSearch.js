/**
 * Created by montymccune on 7/26/19.
 */

import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';
import * as _ from "lodash";
import {Data} from '../data/go/data';



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
  searchResultsHeight;
  resizeSearchTimeout;

  // filterForVisit = false;

  typeFilter;
  bodypartFilter;
  headerDescription='Procedure';

  typeList=['ALL','DME', 'INJECTION', 'IMAGING', 'LAB', 'PROCEDURES', 'SURGERY', 'THERAPY', 'VISIT', 'X-RAY'];
  selectedType=null;
  displayMods=false;

  spinnerLeft=0;
  spinnerTop=0;
  displaySpinner = false;


  selectedProcedures=[]



  popupHelper;

  constructor(DialogController, http, helper, Data){
    this.dialogController = DialogController;
    this.http = http;
    this.helper = helper;
    this.goData = Data;
  }

  close(){
    let self = this;
    self.dialogController.close(true, self.selectedProcedures);
  }

  cancel(){
    let self = this;
    self.dialogController.cancel();
  }

  activate(obj){
    let self = this;

    //self.filterForVisit = obj.hasOwnProperty('visitFilter') ? obj.visitFilter : false;
    //self.bodypartFilter = obj.hasOwnProperty('bodypartFilter') ? obj.bodypartFilter : null;;
    self.typeFilter = obj.hasOwnProperty('typeFilter') ? obj.typeFilter : null;
    self.displayMods = obj.hasOwnProperty('displayModifiers') ? obj.displayModifiers : false;

    if(self.typeFilter==null){
      self.selectedType = self.typeList[5];
    }else{
      self.selectedType = self.typeFilter;
    }

    self.popupWidth = obj.popupWidth * .8;
    self.popupHeight = (obj.popupHeight - 75) * .8;
    self.popupTop = (obj.popupHeight - self.popupHeight) / 2;
    self.popupLeft = (obj.popupWidth - self.popupWidth) / 2;

    self.spinnerLeft = (self.popupWidth / 2) - 21;
    self.spinnerTop = (self.popupHeight / 2)-21;

    self.popupHelper = obj.popupHelper;

    this.search();
  }

  attached(){
    var res = $(this.pxSearch).closest('ux-dialog-container');
    var uxDx = res[0];
    uxDx.style.setProperty("z-index", "5001", "important");

    // var overlay = $(this.dxpop).parents('ux-dialog-overlay');
    // var uxOverlay = overlay[0];
    // uxOverlay.style.setProperty("z-index", "5001", "important");

    var style={
      'z-index': 5001
    }
    // style['background-color']='white';
    // style['opacity']=1;
    $('ux-dialog-overlay').css(style);

    this.resizeSearchResults();
  }

  typeClicked(t){
    this.selectedType = t;

    if(this.selectedType == 'LAB'){
      this.getLoincList();
    }else if(this.selectedType == 'ALL'){
      //do nothing here...
    }else{
      this.search();
    }
  }

  searchClicked(){
    if(this.selectedType == 'LAB'){
      this.searchLoinc();
    }else{
      this.search();
    }
  }

  setSelectedModifier(px, mod){
    px.modifier = mod;
  }

  getLoincList(){
    let self = this;
    self.searchResults=[];
    self.goData.getLoinc(function(res){
      for(let i = 0; i < res.length; i++){
        let r = res[i];
        self.searchResults.push(self.goData.getNewPx(r.LNAMEID, r.LCODE, r.Short_Name, null, r));
      }
    });
  }

  searchLoinc(){
    let self = this;
    self.searchResults=[];
    self.displaySpinner = true;
    self.goData.searchLoinc(self.searchString, function(res){
      for(var i = 0; i < res.length; i++){
        var r = res[i];
        self.searchResults.push(self.goData.getNewPx(r.LNAMEID, r.LCODE, r.Short_Name, null, r));
      }
      self.displaySpinner = false;
    });
  }

  inputKeydown(e){
    if(e.key === 'Enter'){
      this.search();
    }
    return true;
  }

  search(){
    let self = this;
    self.searchResults=[];
    self.displaySpinner = true;
    var url = 'procedures/search?searchTerm='+this.searchString;
    self.http.get(self.helper.getApiUrl(url), function (res) {

      if(res != null && res.length > 0){

        //filter for visit codes...
        var filteredRes = res;

        let tFilter = self.selectedType;

        //filter type...
        if(self.selectedType != null){

          // let tFilter = self.selectedType;
          // if(tFilter == null){
          //   tFilter = self.selectedType;
          // }

          //imaging...MRI, CT, BONE SCAN, IMAGE
          if(tFilter=='IMAGING'){
            filteredRes =_.filter(filteredRes, (item) => {
              return item.Type != null && _.includes(['mri', 'ct', 'bone scan', 'image'], item.Type.toLowerCase());
            });
          }else if(tFilter == 'PROCEDURES'){
            filteredRes =_.filter(filteredRes, (item) => {
              return item.Type != null && 
              (item.Type.toLowerCase() == 'opx' || 
              item.Type.toLowerCase() == 'pt' || 
              item.Type.toLowerCase() == 'ot');
            });
          }else if(tFilter == 'THERAPY'){
            filteredRes =_.filter(filteredRes, (item) => {
              return item.Type != null && 
              (item.Type.toLowerCase() == 'pt' || 
              item.Type.toLowerCase() == 'ot')
            });//_.uniqBy(rooms, 'Description1');
            filteredRes = _.orderBy(filteredRes, 'Description', 'asc');
          }else if(tFilter == 'INJECTION'){
            filteredRes =_.filter(filteredRes, (item) => {
              return item.Type != null && item.Type.toLowerCase() == 'injection';
            });
          }else if(tFilter == 'All'){
            //do nothing...
          }else{
            filteredRes =_.filter(filteredRes, (item) => {
              return item.Type != null && item.Type.toLowerCase() == tFilter.toLowerCase();
            });
          }
        }

        //bodypart type...
        // if(self.bodypartFilter != null){
        //   filteredRes =_.filter(filteredRes, (item) => {
        //     return item.Body_Part != null && item.Body_Part.toLowerCase() == self.bodypartFilter.toLowerCase();
        //   });
        // }

        for(var i = 0; i < filteredRes.length; i++){
          var r = filteredRes[i];

          //change imaging types...
          if(tFilter=='IMAGING'){
            r.Type = 'IMAGE';
          }

          self.searchResults.push(self.goData.getNewPx(r.ProcedureID, r.CptKey, r.Description, null, r));
        }
      }
      self.displaySpinner = false;
    });
  }

  resizeSearchResults(){
    let self = this;
    this.resizeSearchTimeout = setTimeout(self.resizeSearchResultsCallback.bind(self), 50);
  }

  resizeSearchResultsCallback(){
    let self = this
    clearTimeout(self.resizeSearchTimeout)
    //adjust search bar height...
    var selectedPxHeight = $('#selectedProcedures').height();
    selectedPxHeight = selectedPxHeight == undefined ? 0 : selectedPxHeight;
    self.searchResultsHeight = self.popupHeight - 198 - selectedPxHeight;
  }

  addClicked(r){
    let self = this
    var displaySideSelection = self.checkForSideSelection(r);
    self.tryBodysidePicker(displaySideSelection, function(side){

      var pxToAdd = r;

      // if(side != null){
      //   pxToAdd.side = side;
      // }

      //does this procedure exist???
      var foundPx = self.checkSelectedProceduresForExisting(pxToAdd);
      if(foundPx){
        //create new px...
        pxToAdd = self.goData.getNewPx(r.id, r.code, r.description, null, r.data);
      }

      if(side != null){
        pxToAdd.side = side;
      }

      if(r.data.Body_Part != null){
        pxToAdd.part = r.data.Body_Part;
      }


      self.selectedProcedures.push(pxToAdd)
      self.resizeSearchResults();
    });
  }

  checkSelectedProceduresForExisting(px){
    return _.find(this.selectedProcedures, function(p){return p.code == px.code});
  }

  checkForSideSelection(px){
    if(px.data.Body_Part == null)return false;

    var part = px.data.Body_Part.toUpperCase();
    if(part == 'ANKLE' || part == 'KNEE' || part == 'HIP' ||
      part == 'HAND' || part == 'WRIST' || part == 'SHOULDER' ||
      part == 'FOOT' || part == 'ELBOW' || part == '50'){
        return part == '50' ? 'BILATERAL' : true;
      }
      return false;
  }

  tryBodysidePicker(showPicker, callback){
    let self = this;
    if(showPicker){

      //bilateral???
      if(showPicker == 'BILATERAL'){
        callback(showPicker);
        return;
      }

      let msg = `Please select body side.`;
      self.popupHelper.openGenericMessagePop(msg, 'Select Body Side', ['RIGHT','LEFT','BILATERAL'], false, function(res){
        let side = res.result;
        callback(side);
      });
    }else{
      callback(null);
    }
  }

  removeProcedureClick(px){
    let self = this;
    for(let i = 0; i < self.selectedProcedures.length; i++){
      if(self.selectedProcedures[i].data.ProcedureID == px.data.ProcedureID){
        self.selectedProcedures.splice(i, 1)
      }
    }
    self.resizeSearchResults();
  }
}
