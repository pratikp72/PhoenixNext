import {inject} from "aurelia-dependency-injection";
import {observable} from 'aurelia-framework';
import {helper} from "../../helpers/helper";
import {http} from "../../helpers/http";
import {Data} from "../../data/go/data";
import {PopupHelper} from "../../go/popupHelper";
import * as _ from 'lodash';

@inject(helper, http, Data, PopupHelper)
export class CptMaint {

  codes=[];
  filteredCodes=[];
  height;
  selectedCode=null;
  displaySpinner = false;


  @observable filter;
  filterChanged(newVal, oldVal){
    this.filterCodes(newVal);
  }


  constructor(helper, http, Data, PopupHelper) {
    this.helper = helper;
    this.http = http;
    this.goData = Data;
    this.popupHelper = PopupHelper;
  }

  activate(){
    this.setup();
  }

  filterCodes(value){
    //check for cptkey...
    var num = parseInt(value);
    if(!isNaN(num)){
      //filter CptKey...
      this.filteredCodes = _.filter(this.codes, function(u){return u.CptKey.toLowerCase().startsWith(value.toLowerCase());});
    }else{
      if(value.length >= 2){
        var val = value.substring(1)
        var num = parseInt(val);
        if(isNaN(num)){
          this.filteredCodes = _.filter(this.codes, function(u){return u.Description.toLowerCase().startsWith(value.toLowerCase());});
        }else{
          this.filteredCodes = _.filter(this.codes, function(u){return u.CptKey.toLowerCase().startsWith(value.toLowerCase());});
        }
  
      }else{//filter by description...
        this.filteredCodes = _.filter(this.codes, function(u){return u.Description.toLowerCase().startsWith(value.toLowerCase());});
      }
    }
  }

  setup(){
    let self = this;

    self.displaySpinner = true;

    const windowHeight = window.innerHeight;
    self.height = windowHeight - (157);

    self.goData.getAllProcedures(function(res){
      self.codes = res;
      self.filteredCodes = res;

      self.displaySpinner = false;
    });
  }

  edit(user){
    this._openCodePop(user);
  }

  add(){
    let self = this;
    self._openCodePop(this.createNewCode());
    // this.openPopup(this.createNewCode());
  }

  delete(code){
    let self = this;

      let msg = `Do you wish to delete ${code.Description}?`;
      self.popupHelper.openGenericMessagePop(msg, 'Delete Image', ['YES','NO'], false, function(res){
        let r = res.result;
        if(r == 'YES'){

          let saveDescription = `Deleting ${code.Description}...`;
          let saveDialog = self.helper.createNoty(saveDescription, 3000);
          saveDialog.show();

          let url = `procedures/${code.ProcedureID}`;
          self.data.deleteWithUrl(url, function(res){

            saveDialog.close();

            if(!res){
              //error
            }else{
              var deleteIndex = _.indexOf(self.codes, function(c){return c.ProcedureID == code.ProcedureID});

              if(deleteIndex != -1){
                //found it, delete!
                codes.splice(deleteIndex, 1);
              }      
            }
          });

        }
      });

  }


  // openPopup(code){
  //   let self = this;

  //   if(code.ProcedureID != 0){
  //     self._openCodePop(user);
  //   }else{
  //     self._openCodePop(user);
  //   }

  // }

  createNewCode(){

    return{
      CptKey: "",
      Description:"",
      Body_Part:"",
      Type: "",
      Cpt_Code:"",
      Billable:"No",
      Global:"",
      Units: 0,
      ProcedureID:0
    }
  }

  _openCodePop(code){
    let self = this;
    //open popup
    let viewPath = '../administration/dialogs/newCptCode';
    const windowHeight = window.innerHeight - 100;
    const windowWidth = window.innerWidth;

    let width = (windowWidth / 3) * 2;
    let left = (windowWidth / 5);

    let options={
      closeActiveDialog: false
    }

    let title = code.ProcedureID == 0 ? 'New Code' : 'Update Code';

    self.popupHelper.openViewModelPop(viewPath, code, title, width, windowHeight, 50, left, options, function(code, res){
      if(code.hasOwnProperty("cancelled")){
        return;
      }else{
        self.save(code);
      }
    });
  }

  save(code){

    let self = this;
    var url = "procedures"

    //remove proterties...
    delete code.overlay;
    delete code.dialog;


    let saveDialog = self.helper.createNoty("Saving CPT...", 3000);
    saveDialog.show();

    if(code.ProcedureID == 0){
      self.goData.postWithUrlAndData(url, JSON.stringify(code), function(res){

        saveDialog.close();

        //add to list...
        self.codes.push(res);

      });
    }else{
      self.goData.putWithUrlAndData(url, code, function(res){

        saveDialog.close();

      });
    }

  }


}
