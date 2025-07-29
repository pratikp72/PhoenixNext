import {helper} from '../../helpers/helper';
import {http} from '../../helpers/http';
import {inject, bindable} from 'aurelia-framework';
import moment from "moment";
import {Home} from '../home';
import {PopupHelper} from '../popupHelper';
import {Data} from '../../data/go/data';
import * as _ from 'lodash';


class CaseRow{
  constructor(data){
    this.bodypart = "";
    this.data = data;
    this.caseDate=moment(data.CaseDate).format('MM/DD/YYYY');
    this.injuryDate=moment(data.DateInjury).format('MM/DD/YYYY');
    if(data.CaseBodySide){
      this.bodypart=data.CaseBodySide;
    }
    if(data.CaseBodyPart){
      this.bodypart += " " + data.CaseBodyPart;
    }
    this.providerName="";
  }
}

@inject(helper,http,Home, Data, PopupHelper)
export class CaseManager {

  rows=[];
  providers=[];
  patientId;
  date;
  providerId;
  userId;
  bodypart;
  board = null;
  locked = false;


  constructor(helper, http, Home, Data, PopupHelper){
    this.helper = helper;
    this.http = http;
    this.home = Home;
    this.goData = Data;
    this.popupHelper = PopupHelper;
  }

  activate(){
    let self = this;

    if(self.home.currentBoard != null &&
      self.home.currentBoard.patientId != null){
      self.patientId = self.home.currentBoard.patientId;
      self.bodypart = self.home.currentBoard.visitInfo.bodypart;
      self.bodyparts = self.home.currentBoard.visitInfo.bodyparts;
      self.providerId= self.home.currentBoard.visitInfo.providerId;
      self.locked = self.home.currentBoard.visitInfo.locked == 0 ? false : true;

      self.load();
    }
  }

  attached(){
    // let self = this;
    // if(self.home.currentBoard != null &&
    //   self.home.currentBoard.patientId != null){
    //   self.patientId = self.home.currentBoard.patientId;
    //   self.bodypart = self.home.currentBoard.visitInfo.bodypart;
    //
    //   self.load();
    // }
  }




  openCasePop(caseData){

    let self = this;
    let path ='./caseManagerPop';
    const windowHeight = window.innerHeight - 100;
    const windowWidth = window.innerWidth;

    let quarter = windowWidth / 4;
    let width = windowWidth / 2;
    let left = quarter;

    let height = windowHeight / 2;
    let qHeight = windowHeight / 4;
    let top = qHeight;

    let options={
      displayHeader: false,
      bodyPadding: 0,
      scrollHeight: 522
    }

    let header = 'Case Info';//ptAuth.Id==0 ? 'New Case' : ptAuth.Type + " Authorization";

    let model={
      data: caseData,
      providers: self.providers
    }

    self.popupHelper.openViewModelPop(path, model, header, width, height, top, left, options, function(authRes){
      self.save(authRes);
    });
  }

  addAuth(){
    let self = this;
    self.goData.getWithUrl('caseinfo/new', function(res){

      //add current bodypart / side...
      if(self.bodyparts.length > 0){
        res.CaseBodyPart = self.bodyparts[0].part;
        res.CaseBodySide = self.bodyparts[0].side;
      }

      res.ProviderID = self.providerId;

      self.openCasePop(res);
    });
  }


  edit(row){
    let self = this;
    self.openCasePop(row.data);
  }

  load(){
    let self = this;
    self.rows=[];

    self.goData.getProviders(false, function(res){
      self.providers = res;

      let url = `caseinfo/patients/${self.patientId}`;
      self.goData.getWithUrl(url, function(caseData){

        for(let i = 0; i < caseData.length; i++){
          let aRow = new CaseRow(caseData[i]);
          //get provider info...
          let foundProvider = _.find(self.providers, function (p) {
            return p.ProviderID == aRow.data.ProviderID
          });
          if(foundProvider){
            aRow.providerName = foundProvider.ProviderEntity;
          }
          self.rows.push(aRow);
        }
      });
    });
  }

  contactsClicked(row){
    let self = this;
    self.goData.getWithUrl(`CaseInfo/${row.data.CaseID}/contacts`, function(res){


      //build generic table data...
      let columnHeaders=['Contact','Type', 'Fax', 'Phone', 'Email'];
      let rowData = [];
      for(let i = 0; i < res.length; i++){
        let ct= res[i];
        let name = `${ct.LastName} ${ct.FirstName}`;
        let genTableRow = self.goData.getGenericTableRow([name, ct.Type, ct.PhoneFax, ct.Phone, ct.Email], ct);
        genTableRow.id = i;
        rowData.push(genTableRow);
      }
  
      //display generic table...
      self.popupHelper.openGenericTablePop('Contacts', columnHeaders, rowData, false, {zIndex: 5001}, function(res){
        callback(res);
      });


    });
  }

  save(data){
    let self = this;

    if(data.CaseID==0){
      //add patientID...
      data.PatientID=self.patientId;

      let saveDx = self.helper.createNoty('Saving Case...', 3000);
      saveDx.show();
      self.goData.postWithUrlAndData('caseinfo', JSON.stringify(data), function(res){
        saveDx.close();
        //add new row to top of list...
        let newRow = new CaseRow(res);
        self.rows.unshift(newRow);
      });
    }else{
      let updateDx = self.helper.createNoty('Updating Case...', 3000);
      updateDx.show();
      self.goData.putWithUrlAndData('caseinfo', data, function(res){
        updateDx.close();
      });
    }
  }

}
