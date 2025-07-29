import {DialogController} from 'aurelia-dialog';
import {inject, computedFrom} from 'aurelia-framework';
import * as _ from 'lodash';

@inject(DialogController)
export class NewCustomValueDialog {

  popupTop=0;
  popupLeft=0;
  popupWidth = 0;
  popupHeight = 0;

  datasetList=[];
  customValueName=null;
  datasetName=null;
  dataType=null;
  dataTypes=[{"name":'text', "type": 'varchar'}, 
              {"name":'number', "type": 'int'},
              {"name":'date', "type": 'datetime'},
              {"name":'boolean', "type": 'bit'}];

  @computedFrom('customValueName', 'datasetName', 'dataType')
  get incomplete(){
    if(this.customValueName === null || this.datasetName === null || this.dataType === null){
      return true;
    }
    return false;
  }

  constructor(DialogController){
    this.dialogController = DialogController;
  }

  activate(obj){
    let self = this;
    self.datasetList = obj.datasetList;
    self.datasetName = obj.datasetName;
    self.popupWidth = obj.popupWidth / 2;
    self.popupHeight = obj.popupHeight / 4;
    self.popupTop = (obj.popupHeight - self.popupHeight) / 2;
    self.popupLeft = obj.popupWidth / 4;


    if(obj.options){
      //remove datatypes for checkbox...
      if(obj.options.isCheckbox){
        var boolType = _.find(self.dataTypes, function(f){return f.name == 'boolean'});
        self.dataTypes=[];
        self.dataTypes.push(boolType);
      }
      //remove datatypes for textbox...
      if(obj.options.isTextbox){
        var boolIndex = _.indexOf(self.dataTypes, function(f){return f.name == 'boolean'});
        self.dataTypes.splice(boolIndex, 1);
      }
    }
  }

  attached(){
    let self = this;
    var res = $(self.genpicklist).closest('ux-dialog-container');
    var uxDx = res[0];
    uxDx.style.setProperty("z-index", "5001", "important");

    var overlays = $('ux-dialog-overlay');
    for(let i = 0; i < overlays.length; i++){
      let over = overlays[i];
      over.style.setProperty("z-index", "5001", "important");
    }
  }

  selectDataset(dataset){
    this.datasetName = dataset;
  }

  selectDataType(datatype){
    this.dataType = datatype;
  }

  searchDatasetList(){
    var self = this;
    return _.find(self.datasetList, function(d){return d.toLowerCase() == self.datasetName.toLowerCase()});
  }

  ok(){
    let self = this;
    var foundDataset = this.searchDatasetList();
    if(foundDataset){
      self.datasetName = foundDataset;
    }
    self.dialogController.close(true, {name: self.customValueName, dataset: self.datasetName, datatype: self.dataType.type });
  }

  cancel(){
    let self = this;
    self.dialogController.cancel();
  }
}
