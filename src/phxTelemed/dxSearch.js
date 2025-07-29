/**
 * Created by montymccune on 7/26/19.
 */

import {DialogController} from 'aurelia-dialog';
import {inject} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';


class Dx{
  constructor(id, code, desc, data){
    this.id = id;
    this.selected = false;
    this.code = code;
    this.description = desc;
    this.data = data;
  }
}


@inject(DialogController, http, helper)
export class DxSearch {


  selectedDx=null;
  searchResults=[];
  searchString="";
  bodypart="";
  sortByUsage=true;
  distinct=true;

  constructor(DialogController, http, helper){
    this.dialogController = DialogController;
    this.http = http;
    this.helper = helper;
  }

  close(){
    let self = this;
    self.dialogController.close(true, self.selectedDx);
  }

  cancel(){
    let self = this;
    self.dialogController.cancel();
  }

  activate(obj){
    let self = this;
    self.bodypart = obj.bodypart;

    //auto-search by usage, distinct by code
    self.search();

  }

  searchClicked(){

    this.bodypart="";
    this.search();
  }

  search(){
    var self = this;
    self.searchResults=[];
    //(string query, bool icd10, string bodypart, bool sortByUsage, bool distinct)
    var url = 'Diagnosis/search?query='+this.searchString+"&icd10=true&bodypart="+self.bodypart+"&sortByUsage="+self.sortByUsage+"&distinct="+self.distinct;
    self.http.get(self.helper.getApiUrl(url), function (res) {
      for(var i = 0; i < res.length; i++){
        var dx = res[i];
        self.searchResults.push(new Dx(dx.Id, dx.Icd10Code, dx.Description, dx))
      }
    });
  }

  rowClicked(r){
    this.selectedDx = r;
    for(var i = 0; i < this.searchResults.length; i++){
      if(this.searchResults[i].id == r.id){
        this.searchResults[i].selected = true;
      }else{
        this.searchResults[i].selected = false;
      }
    }
  }

}
